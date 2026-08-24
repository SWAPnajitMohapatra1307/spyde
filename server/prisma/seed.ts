import {
  PrismaClient,
  ComplaintCategory,
  TransactionStatus,
  RiskVerdict,
} from '@prisma/client';

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

  console.log('[DB] Seeding Admin record...');
  await prisma.admin.create({
    data: {
      email: 'admin@spyde.dev',
      passwordHash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
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
        passwordHash: '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        isAdmin: u.isAdmin,
        riskScore: u.riskScore,
      },
    });
    createdUsers.push(user);
  }

  console.log('[DB] Seeding Bank Accounts and UPI Handles...');
  const userHandles = [
    'admin@spyde',
    'aarav@okaxis',
    'aditya@okicici',
    'ananya@okhdfc',
    'diya@oksbi',
    'kabir@okaxis',
    'meera@okicici',
    'rohan@okhdfc',
    'sai@oksbi',
    'siddharth@okaxis',
    'tanvi@okicici',
    'vikram@okhdfc',
  ];

  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    await prisma.simBankAccount.create({
      data: {
        userId: user.id,
        ifsc: 'SBIN0000001',
        accountNumberMasked: '••••••••' + (1000 + i),
        accountType: 'SAVINGS',
        balancePaisa: 5000000n,
      },
    });

    await prisma.simUpiHandle.create({
      data: {
        userId: user.id,
        vpa: userHandles[i],
        isPrimary: true,
      },
    });
  }

  console.log('[DB] Seeding 10 Registered Merchants...');
  const merchantsData = [
    { vpa: 'reliance.fresh@okhdfc', businessName: 'Reliance Fresh Store', geoLat: 19.076, geoLng: 72.877, radiusMeters: 150 },
    { vpa: 'taj.hotel@oksbi', businessName: 'The Taj Mahal Palace', geoLat: 18.921, geoLng: 72.833, radiusMeters: 200 },
    { vpa: 'blue.tokai@okicici', businessName: 'Blue Tokai Coffee Roasters', geoLat: 28.535, geoLng: 77.263, radiusMeters: 100 },
    { vpa: 'apollo.pharmacy@okaxis', businessName: 'Apollo Pharmacy', geoLat: 12.971, geoLng: 77.594, radiusMeters: 100 },
    { vpa: 'corner.house@oksbi', businessName: 'Corner House Ice Cream', geoLat: 12.934, geoLng: 77.611, radiusMeters: 100 },
    { vpa: 'ratnadeep@okicici', businessName: 'Ratnadeep Supermarket', geoLat: 17.385, geoLng: 78.486, radiusMeters: 150 },
    { vpa: 'truffles@okaxis', businessName: 'Truffles Cafeteria', geoLat: 12.978, geoLng: 77.641, radiusMeters: 100 },
    { vpa: 'shree.mithai@oksbi', businessName: 'Shree Mithai Sweets', geoLat: 13.082, geoLng: 80.27, radiusMeters: 120 },
    { vpa: 'haldirams@okhdfc', businessName: 'Haldirams Restaurant', geoLat: 28.613, geoLng: 77.209, radiusMeters: 100 },
    { vpa: 'social.indiranagar@okaxis', businessName: 'Indiranagar Social', geoLat: 12.964, geoLng: 77.639, radiusMeters: 150 },
  ];

  for (const m of merchantsData) {
    await prisma.merchantRegistry.create({
      data: {
        vpa: m.vpa,
        businessName: m.businessName,
        businessType: 'RETAIL',
        isVerified: true,
        geoLat: m.geoLat,
        geoLng: m.geoLng,
        radiusMeters: m.radiusMeters,
      },
    });
  }

  console.log('[DB] Seeding 15 Community Complaints...');
  const complaintsData: Array<{
    complainantIndex: number;
    targetVpa: string;
    category: ComplaintCategory;
    description: string;
  }> = [
    { complainantIndex: 1, targetVpa: 'tanvi@okicici', category: ComplaintCategory.FRAUD, description: 'Fake cashback promise. Funds stolen.' },
    { complainantIndex: 2, targetVpa: 'tanvi@okicici', category: ComplaintCategory.FRAUD, description: 'Unauthorised transaction charged without OTP.' },
    { complainantIndex: 3, targetVpa: 'tanvi@okicici', category: ComplaintCategory.SPAM, description: 'Aggressive spam payment requests every hour.' },
    { complainantIndex: 4, targetVpa: 'tanvi@okicici', category: ComplaintCategory.IMPERSONATION, description: 'Pretending to represent electricity department.' },
    { complainantIndex: 5, targetVpa: 'vikram@okhdfc', category: ComplaintCategory.HARASSMENT, description: 'Repeated abusive money requests.' },
    { complainantIndex: 6, targetVpa: 'tanvi@okicici', category: ComplaintCategory.FRAUD, description: 'Simulated lottery scam.' },
    { complainantIndex: 7, targetVpa: 'reliance.fresh@okhdfc', category: ComplaintCategory.OTHER, description: 'POS duplicate debit.' },
    { complainantIndex: 8, targetVpa: 'blue.tokai@okicici', category: ComplaintCategory.FRAUD, description: 'Suspected tampered QR sticker at counter.' },
    { complainantIndex: 9, targetVpa: 'tanvi@okicici', category: ComplaintCategory.FRAUD, description: 'Demanded advance payment for bogus items.' },
    { complainantIndex: 1, targetVpa: 'social.indiranagar@okaxis', category: ComplaintCategory.OTHER, description: 'Overcharged bill discrepancy.' },
    { complainantIndex: 2, targetVpa: 'kabir@okaxis', category: ComplaintCategory.IMPERSONATION, description: 'Impersonating official support.' },
    { complainantIndex: 3, targetVpa: 'sai@oksbi', category: ComplaintCategory.SPAM, description: 'Unsolicited promotional requests.' },
    { complainantIndex: 4, targetVpa: 'meera@okicici', category: ComplaintCategory.OTHER, description: 'Accidental transfer refund request ignored.' },
    { complainantIndex: 5, targetVpa: 'diya@oksbi', category: ComplaintCategory.OTHER, description: 'Payment made but order not fulfilled.' },
    { complainantIndex: 6, targetVpa: 'tanvi@okicici', category: ComplaintCategory.FRAUD, description: 'Identity theft extortion attempt.' },
  ];

  for (const c of complaintsData) {
    await prisma.complaint.create({
      data: {
        complainantId: createdUsers[c.complainantIndex].id,
        targetVpa: c.targetVpa,
        category: c.category,
        description: c.description,
        status: 'PENDING',
      },
    });
  }

  console.log('[DB] Seeding 30 Transactions...');
  const txDefs: Array<{
    sIdx: number;
    rVpa: string;
    amount: bigint;
    status: TransactionStatus;
    verdict: RiskVerdict;
    score: number;
  }> = [
    { sIdx: 1, rVpa: 'reliance.fresh@okhdfc', amount: 125000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 12 },
    { sIdx: 2, rVpa: 'reliance.fresh@okhdfc', amount: 50000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 8 },
    { sIdx: 3, rVpa: 'taj.hotel@oksbi', amount: 850000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 15 },
    { sIdx: 4, rVpa: 'blue.tokai@okicici', amount: 32000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 5 },
    { sIdx: 5, rVpa: 'blue.tokai@okicici', amount: 45000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 9 },
    { sIdx: 6, rVpa: 'apollo.pharmacy@okaxis', amount: 120000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 11 },
    { sIdx: 7, rVpa: 'corner.house@oksbi', amount: 25000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 4 },
    { sIdx: 8, rVpa: 'ratnadeep@okicici', amount: 345000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 18 },
    { sIdx: 9, rVpa: 'truffles@okaxis', amount: 98000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 10 },
    { sIdx: 11, rVpa: 'shree.mithai@oksbi', amount: 150000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 12 },
    { sIdx: 1, rVpa: 'tanvi@okicici', amount: 2000000n, status: TransactionStatus.BLOCKED, verdict: RiskVerdict.BLOCK, score: 92 },
    { sIdx: 2, rVpa: 'tanvi@okicici', amount: 500000n, status: TransactionStatus.CONFIRMED, verdict: RiskVerdict.CHALLENGE, score: 68 },
    { sIdx: 3, rVpa: 'tanvi@okicici', amount: 1200000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.CHALLENGE, score: 74 },
    { sIdx: 4, rVpa: 'haldirams@okhdfc', amount: 60000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 14 },
    { sIdx: 5, rVpa: 'social.indiranagar@okaxis', amount: 450000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 22 },
    { sIdx: 7, rVpa: 'blue.tokai@okicici', amount: 35000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.WARN, score: 45 },
    { sIdx: 8, rVpa: 'apollo.pharmacy@okaxis', amount: 12000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 12 },
    { sIdx: 9, rVpa: 'tanvi@okicici', amount: 900000n, status: TransactionStatus.CONFIRMED, verdict: RiskVerdict.CHALLENGE, score: 71 },
    { sIdx: 11, rVpa: 'tanvi@okicici', amount: 1500000n, status: TransactionStatus.FAILED, verdict: RiskVerdict.BLOCK, score: 89 },
    { sIdx: 1, rVpa: 'corner.house@oksbi', amount: 45000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 5 },
    { sIdx: 2, rVpa: 'ratnadeep@okicici', amount: 280000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 11 },
    { sIdx: 3, rVpa: 'truffles@okaxis', amount: 115000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 10 },
    { sIdx: 4, rVpa: 'shree.mithai@oksbi', amount: 75000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 6 },
    { sIdx: 5, rVpa: 'haldirams@okhdfc', amount: 190000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 12 },
    { sIdx: 6, rVpa: 'social.indiranagar@okaxis', amount: 820000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 25 },
    { sIdx: 7, rVpa: 'reliance.fresh@okhdfc', amount: 95000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 7 },
    { sIdx: 8, rVpa: 'taj.hotel@oksbi', amount: 1450000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 16 },
    { sIdx: 9, rVpa: 'apollo.pharmacy@okaxis', amount: 50000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 9 },
    { sIdx: 11, rVpa: 'corner.house@oksbi', amount: 35000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 5 },
    { sIdx: 1, rVpa: 'truffles@okaxis', amount: 150000n, status: TransactionStatus.SUCCESS, verdict: RiskVerdict.PASS, score: 8 },
  ];

  for (const t of txDefs) {
    const sender = createdUsers[t.sIdx];
    const txn = await prisma.simTransaction.create({
      data: {
        senderId: sender.id,
        receiverVpa: t.rVpa,
        amountPaisa: t.amount,
        status: t.status,
        riskVerdict: t.verdict,
        riskScore: t.score,
        note: 'Sandbox simulated payment',
      },
    });

    if (t.status === TransactionStatus.SUCCESS && t.verdict === RiskVerdict.CHALLENGE) {
      await prisma.livenessSession.create({
        data: {
          userId: sender.id,
          transactionId: txn.id,
          challengeCode: '5821',
          clientScore: 85,
          serverScore: 25,
          totalScore: 110,
          verdict: 'PASS',
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      await prisma.certificate.create({
        data: {
          transactionId: txn.id,
          payloadHash: '0e3bfa6b986b625bdf25b29b4e3fbf25a3d7b4b3b1a5be7b6b12ff90ee69cbb1',
          jwtSignature: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox-signature',
          payload: {
            transactionId: txn.id,
            senderVpa: userHandles[t.sIdx],
            receiverVpa: t.rVpa,
            amountPaisa: t.amount.toString(),
            verdicts: {
              risk: 'CHALLENGE',
              liveness: 'PASS',
              qr: 'VERIFIED',
            },
          },
        },
      });
    }
  }

  const totalUsers = await prisma.user.count();
  const totalMerchants = await prisma.merchantRegistry.count();
  const totalComplaints = await prisma.complaint.count();
  const totalTxs = await prisma.simTransaction.count();

  console.log(`[SUCCESS] Sandbox database seeding completed: ${totalUsers} users, ${totalMerchants} merchants, ${totalComplaints} complaints, ${totalTxs} transactions.`);
}

main()
  .catch((e) => {
    console.error('[ERROR] Database seeding failed: ' + e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });