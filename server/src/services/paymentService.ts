import { Prisma, RiskVerdict, TransactionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { computeRisk, type RiskAssessment } from './riskEngine';
import { toPaisa, toRupees } from '../utils/money';
import { generateNumericCode, sha256 } from '../utils/crypto';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export interface InitiatePaymentInput {
  senderId: string;
  receiverVpa: string;
  amountRupees: number;
  note?: string;
  idempotencyKey?: string;
}

export interface ConfirmPaymentInput {
  transactionId: string;
  senderId: string;
  pin: string;
}

const SIMULATED_PIN = '1234';
const ESCROW_HOLD_SECONDS = 600;

export async function resolveVpa(vpa: string) {
  const normalizedVpa = vpa.toLowerCase().trim();

  const handle = await prisma.simUpiHandle.findUnique({
    where: { vpa: normalizedVpa },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          riskScore: true,
          bankAccounts: {
            where: { isActive: true },
            select: { ifsc: true },
            take: 1,
          },
        },
      },
    },
  });

  const merchant = await prisma.merchantRegistry.findUnique({
    where: { vpa: normalizedVpa },
  });

  let recipientName = 'External Payee';
  let bankName = 'UPI Direct';
  let isRegistered = false;

  if (merchant) {
    recipientName = merchant.businessName;
    bankName = 'Merchant Verified';
    isRegistered = true;
  } else if (handle?.user) {
    recipientName = handle.user.name;
    bankName = handle.user.bankAccounts[0]?.ifsc || 'State Bank of India';
    isRegistered = true;
  }

  const risk = await computeRisk('system_resolve', normalizedVpa, 10000n);

  return {
    vpa: normalizedVpa,
    name: recipientName,
    bank: bankName,
    isRegistered,
    riskVerdict: risk.verdict,
    riskScore: risk.totalScore,
    signals: risk.signals,
  };
}

export async function initiatePayment(input: InitiatePaymentInput) {
  const normalizedVpa = input.receiverVpa.toLowerCase().trim();
  const amountPaisa = toPaisa(input.amountRupees);

  if (input.idempotencyKey) {
    const existingTxn = await prisma.simTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existingTxn) {
      return {
        transactionId: existingTxn.id,
        status: existingTxn.status,
        verdict: existingTxn.riskVerdict,
        riskScore: existingTxn.riskScore,
        signals: existingTxn.riskSignals as Prisma.JsonArray,
        amountRupees: toRupees(existingTxn.amountPaisa),
      };
    }
  }

  const senderAccount = await prisma.simBankAccount.findFirst({
    where: { userId: input.senderId, isActive: true },
  });

  if (!senderAccount || senderAccount.balancePaisa < amountPaisa) {
    throw new ValidationError('Insufficient bank balance for this transaction');
  }

  const receiverHandle = await prisma.simUpiHandle.findUnique({
    where: { vpa: normalizedVpa },
  });
  const receiverId = receiverHandle?.userId || null;

  // ⚡ REDIS RISK CACHE CHECK (5 min TTL) ⚡
  const cacheKey = `risk:${normalizedVpa}`;
  const cachedRisk = await redis.getJson<RiskAssessment>(cacheKey);
  
  let activeRisk: RiskAssessment;
  if (!cachedRisk) {
    activeRisk = await computeRisk(input.senderId, normalizedVpa, amountPaisa);
    await redis.setJson(cacheKey, activeRisk, 300);
    console.log(`[REDIS-RISK] Computed & cached risk score for VPA ${normalizedVpa}`);
  } else {
    activeRisk = cachedRisk;
    console.log(`[REDIS-RISK] Cache HIT for VPA ${normalizedVpa} (Score: ${activeRisk.totalScore})`);
  }

  // -------------------------------------------------------------
  // 🛡️ DYNAMIC RULE 1: Fresh Account Check (Requires Liveness until 2 completed txns)
  // -------------------------------------------------------------
  const totalCompletedTxns = await prisma.simTransaction.count({
    where: { receiverVpa: normalizedVpa, status: TransactionStatus.SUCCESS },
  });

  // Account is considered fresh ONLY if it has completed fewer than 2 transactions
  const isFreshAccount = totalCompletedTxns < 2;

  if (isFreshAccount && activeRisk.verdict !== RiskVerdict.BLOCK) {
    console.log(`[RISK-RULE] VPA ${normalizedVpa} is fresh (${totalCompletedTxns} completed) -> Triggering LIVENESS CHALLENGE`);
    activeRisk = { ...activeRisk, verdict: RiskVerdict.CHALLENGE };
  } else if (!isFreshAccount && activeRisk.verdict === RiskVerdict.CHALLENGE) {
    // Once 2 transactions are complete, relax Liveness Challenge
    activeRisk = { ...activeRisk, verdict: RiskVerdict.PASS };
  }

  // -------------------------------------------------------------
  // 🛡️ DYNAMIC RULE 2: Frequent Payment Velocity Check (Triggers WARN)
  // -------------------------------------------------------------
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentPaymentCount = await prisma.simTransaction.count({
    where: {
      senderId: input.senderId,
      receiverVpa: normalizedVpa,
      createdAt: { gte: oneHourAgo },
    },
  });

  // If paid >= 2 times in the last hour and account is no longer fresh -> Trigger WARN
  if (recentPaymentCount >= 2 && !isFreshAccount && activeRisk.verdict !== RiskVerdict.BLOCK) {
    console.log(`[RISK-RULE] High frequency payments to ${normalizedVpa} (${recentPaymentCount} in 1h) -> Triggering WARN`);
    activeRisk = { ...activeRisk, verdict: RiskVerdict.WARN };
  }

  // -------------------------------------------------------------
  // 🟢 SAFE CIRCLE OVERRIDE: Bypass WARN & CHALLENGE if trusted
  // -------------------------------------------------------------
  const safeContact = await prisma.safeCircleContact.findFirst({
    where: {
      userId: input.senderId,
      contactVpa: normalizedVpa,
    },
  });

  if (
    safeContact &&
    (activeRisk.verdict === RiskVerdict.WARN || activeRisk.verdict === RiskVerdict.CHALLENGE)
  ) {
    console.log(
      `[SAFE_CIRCLE] ${normalizedVpa} is in Safe Circle for user ${input.senderId} — ` +
        `Overriding ${activeRisk.verdict} → PASS`
    );
    activeRisk = { ...activeRisk, verdict: RiskVerdict.PASS };
  }

  // -------------------------------------------------------------
  // 🛑 HARD BLOCK (Cannot be bypassed)
  // -------------------------------------------------------------
  if (activeRisk.verdict === RiskVerdict.BLOCK) {
    const blockedTxn = await prisma.simTransaction.create({
      data: {
        senderId: input.senderId,
        receiverVpa: normalizedVpa,
        receiverId,
        amountPaisa,
        note: input.note || null,
        status: TransactionStatus.BLOCKED,
        riskVerdict: RiskVerdict.BLOCK,
        riskScore: activeRisk.totalScore,
        riskSignals: JSON.stringify(activeRisk.signals),
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    console.warn('[SECURITY] Transaction blocked by Risk Engine: txnId=' + blockedTxn.id + ' score=' + activeRisk.totalScore);

    return {
      transactionId: blockedTxn.id,
      status: TransactionStatus.BLOCKED,
      verdict: RiskVerdict.BLOCK,
      riskScore: activeRisk.totalScore,
      signals: activeRisk.signals,
      amountRupees: input.amountRupees,
    };
  }

  // -------------------------------------------------------------
  // ✅ CREATE TRANSACTION
  // -------------------------------------------------------------
  const txn = await prisma.simTransaction.create({
    data: {
      senderId: input.senderId,
      receiverVpa: normalizedVpa,
      receiverId,
      amountPaisa,
      note: input.note || null,
      status: TransactionStatus.PENDING,
      riskVerdict: activeRisk.verdict,
      riskScore: activeRisk.totalScore,
      riskSignals: JSON.stringify(activeRisk.signals),
      idempotencyKey: input.idempotencyKey || null,
    },
  });

  // -------------------------------------------------------------
  // 📷 LIVENESS ESCROW SESSION
  // -------------------------------------------------------------
  let challengeSessionId: string | null = null;
  if (activeRisk.verdict === RiskVerdict.CHALLENGE) {
    const challengeCode = generateNumericCode(4);
    const expiresAt = new Date(Date.now() + ESCROW_HOLD_SECONDS * 1000);

    const session = await prisma.livenessSession.create({
      data: {
        userId: input.senderId,
        challengeCode,
        transactionId: txn.id,
        expiresAt,
      },
    });

    challengeSessionId = session.id;

    // ⚡ PRIME REDIS CACHE FOR INSTANT POLLING ⚡
    await redis.setJson(`liveness:${session.id}`, {
      status: 'PENDING',
      verdict: 'FAIL',
      challengeCode,
      expiresAt: expiresAt.toISOString(),
      transactionId: txn.id
    }, ESCROW_HOLD_SECONDS);

    console.log('[ESCROW] Created escrow challenge session: sessionId=' + session.id + ' (Code: ' + challengeCode + ')');
  }

  return {
    transactionId: txn.id,
    status: txn.status,
    verdict: txn.riskVerdict,
    riskScore: txn.riskScore,
    signals: activeRisk.signals,
    amountRupees: input.amountRupees,
    challengeSessionId,
  };
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  if (input.pin !== SIMULATED_PIN) {
    throw new ValidationError('Incorrect UPI PIN');
  }

  const txn = await prisma.simTransaction.findUnique({
    where: { id: input.transactionId },
    include: { certificate: true },
  });

  if (!txn) {
    throw new NotFoundError('Transaction not found');
  }

  if (txn.senderId !== input.senderId) {
    throw new ValidationError('Unauthorized to confirm this transaction');
  }

  if (txn.status === TransactionStatus.SUCCESS) {
    return {
      transactionId: txn.id,
      status: 'SUCCESS' as const,
      amountRupees: toRupees(txn.amountPaisa),
      receiverVpa: txn.receiverVpa,
      timestamp: txn.updatedAt,
      certificateId: txn.certificate?.id || null,
    };
  }

  if (txn.status !== TransactionStatus.PENDING) {
    throw new ConflictError('Transaction cannot be confirmed. Current status: ' + txn.status);
  }

  // Fetch sender profile for identity in the certificate
  const senderUser = await prisma.user.findUnique({
    where: { id: txn.senderId },
    include: {
      upiHandles: { where: { isPrimary: true }, take: 1 },
    },
  });
  const senderVpa = senderUser?.upiHandles[0]?.vpa || 'unknown@spyde';
  const senderName = senderUser?.name || 'Unknown Sender';

  // Fetch receiver identity (from handle or merchant registry)
  let receiverName = 'External Payee';
  const receiverHandle = await prisma.simUpiHandle.findUnique({
    where: { vpa: txn.receiverVpa },
    include: { user: { select: { name: true } } },
  });
  if (receiverHandle?.user) {
    receiverName = receiverHandle.user.name;
  } else {
    const merchant = await prisma.merchantRegistry.findUnique({
      where: { vpa: txn.receiverVpa },
    });
    if (merchant) receiverName = merchant.businessName;
  }

  const updatedTxn = await prisma.$transaction(async (tx) => {
    const senderAccount = await tx.simBankAccount.findFirst({
      where: { userId: txn.senderId, isActive: true },
    });

    if (!senderAccount || senderAccount.balancePaisa < txn.amountPaisa) {
      throw new ValidationError('Insufficient funds in account');
    }

    await tx.simBankAccount.update({
      where: { id: senderAccount.id },
      data: { balancePaisa: { decrement: txn.amountPaisa } },
    });

    if (txn.receiverId) {
      const receiverAccount = await tx.simBankAccount.findFirst({
        where: { userId: txn.receiverId, isActive: true },
      });

      if (receiverAccount) {
        await tx.simBankAccount.update({
          where: { id: receiverAccount.id },
          data: { balancePaisa: { increment: txn.amountPaisa } },
        });
      }
    }

    const completedTxn = await tx.simTransaction.update({
      where: { id: txn.id },
      data: { status: TransactionStatus.SUCCESS },
    });

    // ⚡ ENRICHED CERTIFICATE PAYLOAD ⚡
    const certPayload = {
      txId: completedTxn.id,
      senderId: completedTxn.senderId,
      senderVpa,
      senderName,
      receiverVpa: completedTxn.receiverVpa,
      receiverLegalName: receiverName,
      amountPaisa: completedTxn.amountPaisa.toString(),
      amountRupees: toRupees(completedTxn.amountPaisa),
      timestamp: completedTxn.updatedAt.toISOString(),
      riskVerdict: completedTxn.riskVerdict,
      riskScore: completedTxn.riskScore,
      riskSignals: completedTxn.riskSignals,
      geohash: 'tdr1y1e (12.9716° N, 77.5946° E)',
      deviceAttestation: 'Android SafetyNet Hardware / Apple Secure Enclave Pass',
      merkleRoot: sha256(completedTxn.id + completedTxn.updatedAt.toISOString()).slice(0, 64),
      algorithm: 'Ed25519-SHA512 (RFC 8032)',
      publicKey: 'ed25519:9f8e7d6c5b4a392817263544abcfef0123456789abcdef0123456789abcdef01',
    };
    const payloadHash = sha256(JSON.stringify(certPayload));

    const cert = await tx.certificate.create({
      data: {
        transactionId: completedTxn.id,
        payloadHash,
        jwtSignature: 'sig_' + payloadHash + '_' + Date.now().toString(36),
        payload: certPayload,
        // ⚡ DEMO HOOK: If it was a challenge, mock-link face blob so UI shows reveal button
        faceBlobId: completedTxn.riskVerdict === RiskVerdict.CHALLENGE ? `blob_${completedTxn.id}` : null,
      },
    });

    return { ...completedTxn, certificateId: cert.id };
  });

  console.log('[SUCCESS] Payment executed: txnId=' + updatedTxn.id + ' amountPaisa=' + updatedTxn.amountPaisa);

  return {
    transactionId: updatedTxn.id,
    status: 'SUCCESS' as const,
    amountRupees: toRupees(updatedTxn.amountPaisa),
    receiverVpa: updatedTxn.receiverVpa,
    timestamp: updatedTxn.updatedAt,
    certificateId: updatedTxn.certificateId,
  };
}

export async function getPaymentHistory(userId: string, limit = 20, offset = 0) {
  const transactions = await prisma.simTransaction.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      certificate: { select: { id: true, payloadHash: true } },
    },
  });

  const total = await prisma.simTransaction.count({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
  });

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      senderId: t.senderId,
      receiverVpa: t.receiverVpa,
      amountRupees: toRupees(t.amountPaisa),
      status: t.status,
      riskVerdict: t.riskVerdict,
      riskScore: t.riskScore,
      createdAt: t.createdAt,
      certificateId: t.certificate?.id || null,
      isSender: t.senderId === userId,
    })),
    total,
    limit,
    offset,
  };
}