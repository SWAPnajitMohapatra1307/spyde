import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export interface AddContactInput {
  userId: string;
  contactVpa: string;
  contactName?: string;
}

export interface SafeCircleContactItem {
  id: string;
  contactVpa: string;
  contactName: string;
  addedAt: Date;
  hasAnomaly: boolean;
  complaintCount: number;
}

const MAX_CONTACTS_PER_USER = 20;
const CACHE_TTL_SECONDS = 3600;
const ANOMALY_COMPLAINT_THRESHOLD = 10;
const ANOMALY_WINDOW_DAYS = 30;

function getCacheKey(userId: string): string {
  return 'circle:' + userId;
}

/**
 * Checks if a target VPA has accumulated 10 or more complaints in the last 30 days.
 */
export async function checkAnomaly(vpa: string): Promise<{ hasAnomaly: boolean; complaintCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ANOMALY_WINDOW_DAYS);

  const count = await prisma.complaint.count({
    where: {
      targetVpa: vpa.toLowerCase().trim(),
      createdAt: {
        gte: cutoffDate,
      },
    },
  });

  return {
    hasAnomaly: count >= ANOMALY_COMPLAINT_THRESHOLD,
    complaintCount: count,
  };
}

/**
 * Invalidates the Redis cache for a user's safe circle whitelist.
 */
export async function invalidateCache(userId: string): Promise<void> {
  const cacheKey = getCacheKey(userId);
  await redis.del(cacheKey);
  console.log('[CACHE] Invalidated Safe Circle cache for userId=' + userId);
}

/**
 * Fast sub-10ms check to determine if a target VPA is in the user's Safe Circle.
 * Utilizes Redis Set with automatic warm-up from PostgreSQL if cache misses.
 */
export async function isInSafeCircle(userId: string, targetVpa: string): Promise<boolean> {
  const normalizedVpa = targetVpa.toLowerCase().trim();
  const cacheKey = getCacheKey(userId);

  const isMember = await redis.sismember(cacheKey, normalizedVpa);
  if (isMember === 1) {
    return true;
  }

  // Check if cache set exists
  const existingMembers = await redis.smembers(cacheKey);
  if (existingMembers.length > 0) {
    return false;
  }

  // Cache warm-up from database
  const contacts = await prisma.safeCircleContact.findMany({
    where: { userId },
    select: { contactVpa: true },
  });

  if (contacts.length === 0) {
    return false;
  }

  const vpas = contacts.map((c) => c.contactVpa.toLowerCase());
  await redis.sadd(cacheKey, ...vpas);
  await redis.expire(cacheKey, CACHE_TTL_SECONDS);

  return vpas.includes(normalizedVpa);
}

/**
 * Adds a new contact to the user's Safe Circle whitelist.
 */
export async function addContact(input: AddContactInput): Promise<SafeCircleContactItem> {
  const normalizedVpa = input.contactVpa.toLowerCase().trim();

  // Enforce 20 contact limit
  const currentCount = await prisma.safeCircleContact.count({
    where: { userId: input.userId },
  });

  if (currentCount >= MAX_CONTACTS_PER_USER) {
    throw new ValidationError('Safe Circle limit reached. Maximum ' + MAX_CONTACTS_PER_USER + ' contacts allowed.');
  }

  // Check for duplicate contact
  const existing = await prisma.safeCircleContact.findUnique({
    where: {
      userId_contactVpa: {
        userId: input.userId,
        contactVpa: normalizedVpa,
      },
    },
  });

  if (existing) {
    throw new ConflictError('This VPA is already in your Safe Circle');
  }

  // Determine display name
  let displayName = input.contactName?.trim();
  if (!displayName) {
    const handle = await prisma.simUpiHandle.findUnique({
      where: { vpa: normalizedVpa },
      include: { user: true },
    });
    displayName = handle?.user?.name || normalizedVpa.split('@')[0];
  }

  const contact = await prisma.safeCircleContact.create({
    data: {
      userId: input.userId,
      contactVpa: normalizedVpa,
      contactName: displayName,
    },
  });

  await invalidateCache(input.userId);

  const anomaly = await checkAnomaly(normalizedVpa);

  console.log('[SECURITY] Contact added to Safe Circle: userId=' + input.userId + ' vpa=' + normalizedVpa);

  return {
    id: contact.id,
    contactVpa: contact.contactVpa,
    contactName: contact.contactName,
    addedAt: contact.addedAt,
    hasAnomaly: anomaly.hasAnomaly,
    complaintCount: anomaly.complaintCount,
  };
}

/**
 * Removes a contact from the user's Safe Circle whitelist.
 */
export async function removeContact(userId: string, contactId: string): Promise<void> {
  const contact = await prisma.safeCircleContact.findUnique({
    where: { id: contactId },
  });

  if (!contact || contact.userId !== userId) {
    throw new NotFoundError('Safe Circle contact not found');
  }

  await prisma.safeCircleContact.delete({
    where: { id: contactId },
  });

  await invalidateCache(userId);

  console.log('[SECURITY] Contact removed from Safe Circle: userId=' + userId + ' contactId=' + contactId);
}

/**
 * Lists all contacts in the user's Safe Circle along with 30-day anomaly flags.
 */
export async function listContacts(userId: string): Promise<SafeCircleContactItem[]> {
  const contacts = await prisma.safeCircleContact.findMany({
    where: { userId },
    orderBy: { addedAt: 'desc' },
  });

  const enrichedContacts: SafeCircleContactItem[] = [];

  for (const contact of contacts) {
    const anomaly = await checkAnomaly(contact.contactVpa);
    enrichedContacts.push({
      id: contact.id,
      contactVpa: contact.contactVpa,
      contactName: contact.contactName,
      addedAt: contact.addedAt,
      hasAnomaly: anomaly.hasAnomaly,
      complaintCount: anomaly.complaintCount,
    });
  }

  return enrichedContacts;
}