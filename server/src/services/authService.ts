import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { AuthError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { sha256 } from '../utils/crypto';

export interface TokenPayload {
  userId: string;
  phone: string;
  isAdmin: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  vpa: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (_error: unknown) {
    throw new AuthError('Access token is invalid or expired');
  }
}

export async function createRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = sha256(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return rawToken;
}

export async function registerUser(
  input: RegisterInput,
  userAgent?: string,
  ipAddress?: string
): Promise<{ user: { id: string; name: string; phone: string; vpa: string }; tokens: AuthTokens }> {
  const normalizedVpa = input.vpa.toLowerCase().trim();
  const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        input.email ? { email: input.email } : {},
      ],
    },
  });

  if (existingUser) {
    throw new ConflictError('User with this phone number or email already exists');
  }

  const existingHandle = await prisma.simUpiHandle.findUnique({
    where: { vpa: normalizedVpa },
  });

  if (existingHandle) {
    throw new ConflictError('VPA handle is already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        phone: cleanPhone,
        email: input.email || null,
        passwordHash,
        riskScore: 0,
        isAdmin: false,
        isActive: true,
      },
    });

    await tx.simBankAccount.create({
      data: {
        userId: user.id,
        ifsc: 'SBIN0000001',
        accountNumberMasked: 'XXXXXX' + cleanPhone.slice(-4),
        accountType: 'SAVINGS',
        balancePaisa: 1000000n,
      },
    });

    await tx.simUpiHandle.create({
      data: {
        userId: user.id,
        vpa: normalizedVpa,
        isPrimary: true,
      },
    });

    return user;
  });

  const tokenPayload: TokenPayload = {
    userId: result.id,
    phone: result.phone,
    isAdmin: result.isAdmin,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(result.id, userAgent, ipAddress);

  console.log('[AUTH] User registered successfully: userId=' + result.id);

  return {
    user: {
      id: result.id,
      name: result.name,
      phone: result.phone,
      vpa: normalizedVpa,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function loginUser(
  input: LoginInput,
  userAgent?: string,
  ipAddress?: string
): Promise<{ user: { id: string; name: string; phone: string; isAdmin: boolean }; tokens: AuthTokens }> {
  // Extract clean 10-digit phone number regardless of country code prefix
  const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);

  const user = await prisma.user.findUnique({
    where: { phone: cleanPhone },
  });

  if (!user) {
    throw new AuthError('Invalid phone number or password');
  }

  if (!user.isActive) {
    throw new AuthError('Invalid phone number or password');
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthError('Invalid phone number or password');
  }

  const tokenPayload: TokenPayload = {
    userId: user.id,
    phone: user.phone,
    isAdmin: user.isAdmin,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(user.id, userAgent, ipAddress);

  console.log('[AUTH] ✅ User logged in successfully: userId=' + user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      isAdmin: user.isAdmin,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function rotateRefreshToken(
  rawRefreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> {
  if (!rawRefreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  const tokenHash = sha256(rawRefreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AuthError('Invalid refresh token');
  }

  if (storedToken.isRevoked) {
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { isRevoked: true },
    });
    console.warn('[SECURITY] Revoked all tokens due to token reuse attempt for userId=' + storedToken.userId);
    throw new AuthError('Refresh token was revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AuthError('Refresh token has expired');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const tokenPayload: TokenPayload = {
    userId: storedToken.user.id,
    phone: storedToken.user.phone,
    isAdmin: storedToken.user.isAdmin,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = await createRefreshToken(storedToken.user.id, userAgent, ipAddress);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function revokeToken(rawRefreshToken: string): Promise<void> {
  if (!rawRefreshToken) return;

  const tokenHash = sha256(rawRefreshToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, isRevoked: false },
    data: { isRevoked: true },
  });

  console.log('[AUTH] Refresh token revoked successfully');
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      riskScore: true,
      isAdmin: true,
      createdAt: true,
      bankAccounts: {
        where: { isActive: true },
        select: {
          id: true,
          ifsc: true,
          accountNumberMasked: true,
          accountType: true,
          balancePaisa: true,
        },
      },
      upiHandles: {
        where: { isActive: true },
        select: {
          id: true,
          vpa: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  return {
    ...user,
    bankAccounts: user.bankAccounts.map((acc) => ({
      ...acc,
      balancePaisa: acc.balancePaisa.toString(),
      balanceRupees: Number(acc.balancePaisa) / 100,
    })),
  };
}