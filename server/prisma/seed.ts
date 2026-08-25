/// <reference types="node" />
import {
  PrismaClient,
  ComplaintCategory,
  TransactionStatus,
  RiskVerdict,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('[DB] Starting sandbox database seeding...');

  console.log('[DB] Cleaning existing records...');
  await prisma.faceBlob.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.livenessSession.deleteMany();
  await prisma.simTransaction.deleteMany();
  await prisma.safeCircleContact.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.simUpiHandle.deleteMany();
  await prisma.simBankAccount.deleteMany();
  await prisma.merchantRegistry.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();

  const standardPasswordHash = await bcrypt.hash('Password@123', 12);

  console.log('[DB] Seeding Admin record...');
  await prisma.admin.create({
    data: {
      email: 'admin@spyde.dev',
      passwordHash: standardPasswordHash,
      name: 'System Administrator',
      role: 'SUPERADMIN',
      isActive: true,
    },
  });

  console.log('[DB] Seeding 12 users...');
  const usersData = [
    { name: 'Admin Portal User', phone: '+919999999999', email: 'admin.user@spyde.dev', isAdmin: true, riskScore: 0 },
    { name: 'Aarav Sharma', phone: '+919876543210', email: 'aarav@example.com', isAdmin: false, riskScore: 5 },
    { name: 'Aditya Patel', phone: '+919876543211', email: 'aditya@example.com', isAdmin: false, riskScore: 10 },
    { name: 'Ananya Iyer', phone: '+919876543212', email: 'ananya@example.com', isAdmin: false, riskScore: 0 },
    { name: 'Diya Nair', phone: '+919876543213', email: 'diya@example.com', isAdmin: false, riskScore: 12 },
    { name: 'Kabir Verma', phone: '+919876543214', email: 'kabir@example.com', isAdmin: false, riskScore: 8 },
    { name: 'Meera Sen', phone: '+919876543215', email: 'meera@example.com', isAdmin: false, riskScore: 2 },
    { name: 'Rohan Gupta', phone: '+919876543216', email: 'rohan@example.com', isAdmin: false, riskScore: 0 },
    { name: 'Sai Reddy', phone: '+919876543217', email: 'sai@example.com', isAdmin: false, riskScore: 15 },
    { name: 'Siddharth Rao', phone: '+919876543218', email: 'siddharth@example.com', isAdmin: false, riskScore: 25 },
    { name: 'Tanvi Joshi', phone: '+919876543219', email: 'tanvi@example.com', isAdmin: false, riskScore: 88 },
    { name: 'Vikram Singh', phone: '+919876543220', email: 'vikram@example.com', isAdmin: false, riskScore: 40 },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        phone: u.phone,
        email: u.email,
        name: u.name,
        passwordHash: standardPasswordHash,
        isAdmin: u.isAdmin,
        riskScore: u.riskScore,
      },
    });
    createdUsers.push(user);
  }

  console.log('[DB] Seeding Bank Accounts and UPI Handles for users...');
  const upiSuffixes = ['okhdfc', 'okaxis', 'okicici', 'oksbi'];
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const phone = user.phone;
    const suffix = upiSuffixes[i % upiSuffixes.length];
    const username = user.name.toLowerCase().replace(/[^a-z]/g, '');

    await prisma.simBankAccount.create({
      data: {
        userId: user.id,
        ifsc: 'SBIN000000' + (i + 1),
        accountNumberMasked: 'XXXXXX' + phone.slice(-4),
        accountType: 'SAVINGS',
        balancePaisa: 50000000n, // INR 500,000.00
      },
    });

    await prisma.simUpiHandle.create({
      data: {
        userId: user.id,
        vpa: i === 0 ? 'admin@spyde' : `${username}@${suffix}`,
        isPrimary: true,
      },
    });
  }

  console.log('[DB] Seeding 10 registered merchants...');
  const merchantsData = [
    { vpa: 'reliance.fresh@okhdfc', businessName: 'Reliance Fresh Store', businessType: 'RETAIL', geoLat: 19.076, geoLng: 72.877, radiusMeters: 150 },
    { vpa: 'taj.hotel@oksbi', businessName: 'The Taj Mahal Palace', businessType: 'RETAIL', geoLat: 18.921, geoLng: 72.833, radiusMeters: 200 },
    { vpa: 'blue.tokai@okicici', businessName: 'Blue Tokai Coffee Roasters', businessType: 'RETAIL', geoLat: 28.535, geoLng: 77.263, radiusMeters: 100 },
    { vpa: 'apollo.pharmacy@okaxis', businessName: 'Apollo Pharmacy', businessType: 'RETAIL', geoLat: 12.971, geoLng: 77.594, radiusMeters: 100 },
    { vpa: 'corner.house@oksbi', businessName: 'Corner House Ice Cream', businessType: 'RETAIL', geoLat: 12.934, geoLng: 77.611, radiusMeters: 100 },
    { vpa: 'nature.basket@okhdfc', businessName: "Nature's Basket Supermarket", businessType: 'RETAIL', geoLat: 19.059, geoLng: 72.829, radiusMeters: 120 },
    { vpa: 'saravana.bhavan@okicici', businessName: 'Hotel Saravana Bhavan', businessType: 'RETAIL', geoLat: 13.082, geoLng: 80.27, radiusMeters: 100 },
    { vpa: 'fabindia@okaxis', businessName: 'Fabindia Experience Centre', businessType: 'RETAIL', geoLat: 28.613, geoLng: 77.209, radiusMeters: 150 },
    { vpa: 'leopold.cafe@okhdfc', businessName: 'Leopold Cafe & Bar', businessType: 'RETAIL', geoLat: 18.923, geoLng: 72.832, radiusMeters: 80 },
    { vpa: 'crossword.books@oksbi', businessName: 'Crossword Bookstore', businessType: 'RETAIL', geoLat: 18.52, geoLng: 73.856, radiusMeters: 100 },
  ];

  for (const m of merchantsData) {
    await prisma.merchantRegistry.create({ data: m });
  }

  console.log('[DB] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[DB] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });