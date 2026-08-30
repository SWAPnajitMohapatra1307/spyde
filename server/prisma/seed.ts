/// <reference types="node" />
import {
  PrismaClient,
  ComplaintCategory,
  TransactionStatus,
  RiskVerdict,
  ComplaintStatus,
  LivenessVerdict,
  QrVerdict,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================================');
  console.log('[DB] STARTING SPYDE INTEGRATION SEEDING ENGINE...');
  console.log('================================================================================');

  // 1. CLEAN EXISTING RECORDS IN CORRECT ORDER (DEPENDENCY-AWARE)
  console.log('[DB] Cleaning database tables...');
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
  await prisma.qrScanLog.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  console.log('[DB] All historical tables purged successfully.');

  const standardPasswordHash = await bcrypt.hash('Password@123', 12);

  // 2. SEED ADMIN PORTAL USER
  console.log('[DB] Seeding Security Admin record...');
  await prisma.admin.create({
    data: {
      email: 'admin@spyde.dev',
      passwordHash: standardPasswordHash,
      name: 'System Administrator',
      role: 'SUPERADMIN',
      isActive: true,
    },
  });

  // 3. SEED PRIMARY DEMO USER (Siddharth Roy / 9123456780)
  console.log('[DB] Seeding Primary Demo User (Pillar 1)...');
  const primaryUser = await prisma.user.create({
    data: {
      name: 'Siddharth Roy',
      phone: '9123456780',
      email: 'sid@spyde.io',
      passwordHash: standardPasswordHash,
      isAdmin: true, // Allow dual simulation mode (Regular + Admin panels)
      isActive: true, // Explicitly active
      riskScore: 12,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    },
  });

  // Create Primary Bank Account (HDFC Bank - ₹100,000.00)
  await prisma.simBankAccount.create({
    data: {
      userId: primaryUser.id,
      ifsc: 'HDFC0001234',
      accountNumberMasked: '•••• •••• 4321',
      accountType: 'SAVINGS',
      balancePaisa: 10000000n, // INR 100,000.00
    },
  });

  // Bind Multiple UPI handles to prevent frontend fallback misses
  const upiHandles = ['sid@okhdfc', 'user@spyde', 'demouser@okhdfcbank'];
  for (const handle of upiHandles) {
    await prisma.simUpiHandle.create({
      data: {
        userId: primaryUser.id,
        vpa: handle,
        isPrimary: handle === 'sid@okhdfc',
      },
    });
  }

  // 4. SEED AUXILIARY DEMO USERS (To support network graph + complaint simulation)
  console.log('[DB] Seeding Secondary Demo Users...');
  const suspiciousUser = await prisma.user.create({
    data: {
      name: 'Madan Lal (Flagged Payer)',
      phone: '9876543211',
      email: 'madan@spyde.io',
      passwordHash: standardPasswordHash,
      isActive: true, // Explicitly active
      riskScore: 82,
    },
  });

  await prisma.simBankAccount.create({
    data: {
      userId: suspiciousUser.id,
      ifsc: 'SBIN0000999',
      accountNumberMasked: '•••• •••• 9999',
      accountType: 'SAVINGS',
      balancePaisa: 150000n, // INR 1,500.00
    },
  });

  await prisma.simUpiHandle.create({
    data: {
      userId: suspiciousUser.id,
      vpa: 'madan@oksbi',
      isPrimary: true,
    },
  });

  // 5. SEED SAFE CIRCLE CONTACTS FOR Siddharth Roy
  console.log('[DB] Seeding Siddharth Roy\'s Safe Circle (Pillar 2)...');
  const safeContacts = [
    { contactVpa: 'mom@oksbi', contactName: 'Mom (Ananya Roy)' },
    { contactVpa: 'landlord@okaxis', contactName: 'Landlord (Mr. Verma)' },
    { contactVpa: 'reliance.fresh@okhdfc', contactName: 'Reliance Fresh Store' },
  ];

  for (const contact of safeContacts) {
    await prisma.safeCircleContact.create({
      data: {
        userId: primaryUser.id,
        contactVpa: contact.contactVpa,
        contactName: contact.contactName,
      },
    });
  }

  // 6. SEED REGISTERED MERCHANTS (With simulated locations)
  console.log('[DB] Seeding Geo-located Merchant Registries (Pillar 3)...');
  const merchants = [
    {
      vpa: 'merchant@okaxis',
      businessName: 'Apex Secure Retail Ltd',
      businessType: 'RETAIL',
      geoLat: 12.971598,
      geoLng: 77.594562,
      radiusMeters: 100,
      address: 'Prestige Plaza, Bengaluru, Karnataka 560001',
    },
    {
      vpa: 'escrow.seller@okicici',
      businessName: 'High-Value Electronics Store',
      businessType: 'RETAIL',
      geoLat: 12.934892,
      geoLng: 77.611234,
      radiusMeters: 150,
      address: 'Koramangala 5th Block, Bengaluru, Karnataka 560095',
    },
    {
      vpa: 'tampered.qr@okhdfcbank',
      businessName: 'Local Corner Shop (Flagged QR)',
      businessType: 'RETAIL',
      geoLat: 13.0827,
      geoLng: 80.2707, // Intentionally distant to trigger GPS spoofing checks
      radiusMeters: 50,
      address: 'Egmore, Chennai, Tamil Nadu 600008',
    },
    {
      vpa: 'reliance.fresh@okhdfc',
      businessName: 'Reliance Fresh Store',
      businessType: 'RETAIL',
      geoLat: 12.972,
      geoLng: 77.594,
      radiusMeters: 120,
      address: 'Brigade Road, Bengaluru, Karnataka 560025',
    },
    {
      vpa: 'taj.hotel@oksbi',
      businessName: 'The Taj Mahal Palace',
      businessType: 'RETAIL',
      geoLat: 18.921836,
      geoLng: 72.833358,
      radiusMeters: 200,
      address: 'Colaba, Mumbai, Maharashtra 400001',
    },
  ];

  for (const m of merchants) {
    await prisma.merchantRegistry.create({
      data: m,
    });
  }

  // 7. SEED HISTORICAL TRANSACTIONS FOR Siddharth Roy (Pillar 4)
  console.log('[DB] Seeding Transaction Ledger (With preloaded Security Certificates)...');

  // Transaction A: Regular SUCCESS (PASS)
  const txSuccess = await prisma.simTransaction.create({
    data: {
      senderId: primaryUser.id,
      receiverVpa: 'reliance.fresh@okhdfc',
      amountPaisa: 45000n, // ₹450.00
      note: 'Weekly Groceries',
      status: TransactionStatus.SUCCESS,
      riskVerdict: RiskVerdict.PASS,
      riskScore: 4,
      riskSignals: JSON.stringify(['GEOLOCATION_MATCH', 'SAFE_CIRCLE_CONTACT']),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
  });

  // Certificate A
  await prisma.certificate.create({
    data: {
      transactionId: txSuccess.id,
      payloadHash: '0x3a82efd9726df90a8c2d1b2f8a4e5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      jwtSignature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzcHlkZV9oc20iLCJoYXNoIjoiMHgzYTgyZWZkOSJ9...',
      payload: {
        transactionId: txSuccess.id,
        amountRupees: 450.0,
        senderVpa: 'sid@okhdfc',
        receiverVpa: 'reliance.fresh@okhdfc',
        verdict: 'PASS',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  // Transaction B: High-Value Escrow Completed (CHALLENGE / SUCCESS)
  const txEscrow = await prisma.simTransaction.create({
    data: {
      senderId: primaryUser.id,
      receiverVpa: 'escrow.seller@okicici',
      amountPaisa: 1500000n, // ₹15,000.00
      note: 'Refurbished MacBook Air',
      status: TransactionStatus.SUCCESS,
      riskVerdict: RiskVerdict.CHALLENGE,
      riskScore: 42,
      riskSignals: JSON.stringify(['HIGH_VALUE_THRESHOLD', 'NEW_MERCHANT_INTERACTION']),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  // Completed Liveness Session for Escrow
  await prisma.livenessSession.create({
    data: {
      transactionId: txEscrow.id,
      userId: primaryUser.id,
      challengeCode: '3942',
      clientScore: 98,
      serverScore: 96,
      totalScore: 97,
      verdict: LivenessVerdict.PASS,
      expiresAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  // Certificate with view-once face blob attached
  const certEscrow = await prisma.certificate.create({
    data: {
      transactionId: txEscrow.id,
      payloadHash: '0x8f2d9c4e1a3b7f5e6d0c4a8b2f1e3d5c7a9b0c2d4e6f8a1b3c5d7e9f0a2b4c6d',
      jwtSignature: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzcHlkZV9oc20iLCJoYXNoIjoiMHg8ZjJkOWM0ZSJ9...',
      payload: {
        transactionId: txEscrow.id,
        amountRupees: 15000.0,
        senderVpa: 'sid@okhdfc',
        receiverVpa: 'escrow.seller@okicici',
        verdict: 'CHALLENGE',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  // Active (unviewed) biometric audit record
  await prisma.faceBlob.create({
    data: {
      certificateId: certEscrow.id,
      encryptedData: Buffer.from('AES256GCM:9f8a3c2b1e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a'),
      iv: Buffer.from('a1b2c3d4e5f6'),
      authTag: Buffer.from('8f7e6d5c4b3a2f1e'),
      isViewed: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Viewable for next 24 hours
    },
  });

  // Sync Certificate's faceBlobId back
  await prisma.certificate.update({
    where: { id: certEscrow.id },
    data: { faceBlobId: certEscrow.id },
  });

  // Transaction C: Blatantly BLOCKED suspicious transaction (BLOCK)
  const txBlocked = await prisma.simTransaction.create({
    data: {
      senderId: primaryUser.id,
      receiverVpa: 'tampered.qr@okhdfcbank',
      amountPaisa: 250000n, // ₹2,500.00
      note: 'Quick Corner Purchase',
      status: TransactionStatus.BLOCKED,
      riskVerdict: RiskVerdict.BLOCK,
      riskScore: 94,
      riskSignals: JSON.stringify(['TAMPERED_QR_DETECTED', 'CRITICAL_GPS_DISCREPANCY']),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  // 8. SEED COMPLAINTS AND SECURITY AUDIT SCANS
  console.log('[DB] Seeding Security Scan Logs & Community Complaints (Pillar 6)...');

  // Create an explicit QR tamper scan log
  await prisma.qrScanLog.create({
    data: {
      scannedBy: primaryUser.phone,
      vpa: 'tampered.qr@okhdfcbank',
      merchantId: 'tampered_shop_id',
      verdict: QrVerdict.TAMPERED,
      deviceLat: 12.971598,
      deviceLng: 77.594562,
      merchantLat: 13.0827,
      merchantLng: 80.2707,
      distanceM: 350000.0, // 350km away!
      rawPayload: 'upi://pay?pa=tampered.qr@okhdfcbank&pn=Local%20Corner%20Shop&am=2500.00&tr=invalid_hash',
    },
  });

  // Primary user files a complaint against the tampered merchant
  await prisma.complaint.create({
    data: {
      complainantId: primaryUser.id,
      targetVpa: 'tampered.qr@okhdfcbank',
      category: ComplaintCategory.QR_TAMPERING,
      description: 'The sticker QR code pasted on the counter has been overlaid with a fraudulent receiver UPI handle!',
      status: ComplaintStatus.PENDING,
      transactionId: txBlocked.id,
    },
  });

  // 9. RE-INJECT DYNAMIC RISK SCORE ADJUSTMENTS (Pillar 7)
  console.log('[DB] Seeding Risk Engine Event Stream...');
  await prisma.riskEvent.create({
    data: {
      userId: primaryUser.id,
      eventType: 'SAFE_CIRCLE_ADD',
      delta: -5,
      reason: 'Linked Mom (mom@oksbi) to trusted Circle contacts.',
      source: 'RISK_ENGINE_SCHEDULER',
    },
  });

  await prisma.riskEvent.create({
    data: {
      userId: primaryUser.id,
      eventType: 'GPS_SPOOF_ATTEMPT',
      delta: 15,
      reason: 'Initiated transaction with extreme geo-location variance.',
      source: 'MIDDLEWARE_BIOMETRIC_ORCHESTRATOR',
    },
  });

  // 10. SEED DEDICATED DEMO VPAs FOR RISK VERDICT TESTING (WARN / CHALLENGE + LIVENESS / BLOCK)
  console.log('[DB] Seeding Dedicated Demo VPAs for Risk Engine Testing...');

  // A. WARN DEMO VPA: warn.test@spyde
  const warnUser = await prisma.user.create({
    data: {
      name: 'Warn Demo Payee',
      phone: '9000000001',
      email: 'warn.demo@spyde.io',
      passwordHash: standardPasswordHash,
      isActive: true,
      riskScore: 55,
    },
  });
  await prisma.simBankAccount.create({
    data: {
      userId: warnUser.id,
      ifsc: 'SBIN0001001',
      accountNumberMasked: '•••• •••• 1001',
      accountType: 'SAVINGS',
      balancePaisa: 500000n,
    },
  });
  await prisma.simUpiHandle.create({
    data: { userId: warnUser.id, vpa: 'warn.test@spyde', isPrimary: true },
  });

  await prisma.complaint.createMany({
    data: [
      {
        complainantId: primaryUser.id,
        targetVpa: 'warn.test@spyde',
        category: ComplaintCategory.FRAUD,
        description: 'Verified fraud complaints for WARN path testing',
        status: ComplaintStatus.VERIFIED, // 25 * 1.5 = 37.5 pts
      },
      {
        complainantId: primaryUser.id,
        targetVpa: 'warn.test@spyde',
        category: ComplaintCategory.SPAM,
        description: 'Spam complaints',
        status: ComplaintStatus.PENDING, // +5 pts -> Total community = 42.5 + Age(10) = 52.5 pts (WARN)
      },
    ],
  });

  // B. CHALLENGE DEMO VPA (ACTIVATES LIVENESS): challenge.liveness@spyde
  const challengeUser = await prisma.user.create({
    data: {
      name: 'Challenge Liveness Payee',
      phone: '9000000002',
      email: 'challenge.demo@spyde.io',
      passwordHash: standardPasswordHash,
      isActive: true,
      riskScore: 80,
    },
  });
  await prisma.simBankAccount.create({
    data: {
      userId: challengeUser.id,
      ifsc: 'ICIC0001002',
      accountNumberMasked: '•••• •••• 1002',
      accountType: 'SAVINGS',
      balancePaisa: 500000n,
    },
  });
  await prisma.simUpiHandle.create({
    data: { userId: challengeUser.id, vpa: 'challenge.liveness@spyde', isPrimary: true },
  });

  await prisma.complaint.createMany({
    data: [
      {
        complainantId: primaryUser.id,
        targetVpa: 'challenge.liveness@spyde',
        category: ComplaintCategory.QR_TAMPERING,
        description: 'QR Tampering report triggering step-up verification',
        status: ComplaintStatus.VERIFIED, // 30 * 1.5 = 45 pts
      },
      {
        complainantId: primaryUser.id,
        targetVpa: 'challenge.liveness@spyde',
        category: ComplaintCategory.FRAUD,
        description: 'Fraud reports',
        status: ComplaintStatus.VERIFIED, // Capped at Max 50 community pts
      },
    ],
  });

  // Seed blocked graph edge link so graphScorer adds +15 pts (Community 50 + Graph 15 + Age 10 = 75 pts -> CHALLENGE!)
  await prisma.simTransaction.create({
    data: {
      senderId: primaryUser.id,
      receiverVpa: 'challenge.liveness@spyde',
      receiverId: challengeUser.id,
      amountPaisa: 100000n,
      note: 'Pre-seeded graph risk link',
      status: TransactionStatus.BLOCKED,
      riskVerdict: RiskVerdict.BLOCK,
      riskScore: 92,
      riskSignals: JSON.stringify(['SEED_GRAPH_RISK']),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // C. BLOCK DEMO VPA: block.scam@spyde
  const blockUser = await prisma.user.create({
    data: {
      name: 'Blocked Scam Payee',
      phone: '9000000003',
      email: 'block.demo@spyde.io',
      passwordHash: standardPasswordHash,
      isActive: true,
      riskScore: 98,
    },
  });
  await prisma.simBankAccount.create({
    data: {
      userId: blockUser.id,
      ifsc: 'HDFC0001003',
      accountNumberMasked: '•••• •••• 1003',
      accountType: 'SAVINGS',
      balancePaisa: 10000n,
    },
  });
  await prisma.simUpiHandle.create({
    data: { userId: blockUser.id, vpa: 'block.scam@spyde', isPrimary: true },
  });

  await prisma.complaint.createMany({
    data: [
      {
        complainantId: primaryUser.id,
        targetVpa: 'block.scam@spyde',
        category: ComplaintCategory.QR_TAMPERING,
        description: 'Critical Scam VPA - Mandatory Block',
        status: ComplaintStatus.VERIFIED,
      },
      {
        complainantId: primaryUser.id,
        targetVpa: 'block.scam@spyde',
        category: ComplaintCategory.FRAUD,
        description: 'Stolen funds reported',
        status: ComplaintStatus.VERIFIED,
      },
      {
        complainantId: primaryUser.id,
        targetVpa: 'block.scam@spyde',
        category: ComplaintCategory.IMPERSONATION,
        description: 'Fake bank representative',
        status: ComplaintStatus.VERIFIED,
      },
    ],
  });

  await prisma.simTransaction.create({
    data: {
      senderId: primaryUser.id,
      receiverVpa: 'block.scam@spyde',
      receiverId: blockUser.id,
      amountPaisa: 500000n,
      note: 'Pre-seeded critical blocked edge 1',
      status: TransactionStatus.BLOCKED,
      riskVerdict: RiskVerdict.BLOCK,
      riskScore: 99,
      riskSignals: JSON.stringify(['SEED_BLOCK_GRAPH_1']),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('================================================================================');
  console.log('[DB] DATABASE SEEDING COMPLETED SUCCESSFULLY! ✅');
  console.log('================================================================================');
}

main()
  .catch((e) => {
    console.error('[DB] Seeding failed with critical execution exception:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });