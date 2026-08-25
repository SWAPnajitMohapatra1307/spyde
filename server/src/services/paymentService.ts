import { Prisma, RiskVerdict, TransactionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
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
const ESCROW_HOLD_SECONDS = 600; // 10 minutes hold

/**
 * Resolves a VPA to its recipient display name, bank name, and cached risk verdict.
 */
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

/**
 * Initiates a transaction, performs real-time fraud assessment, and reserves funds or triggers challenge.
 */
export async function initiatePayment(input: InitiatePaymentInput) {
  const normalizedVpa = input.receiverVpa.toLowerCase().trim();
  const amountPaisa = toPaisa(input.amountRupees);

  // 1. Idempotency dedup check
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

  // 2. Validate sender balance
  const senderAccount = await prisma.simBankAccount.findFirst({
    where: { userId: input.senderId, isActive: true },
  });

  if (!senderAccount || senderAccount.balancePaisa < amountPaisa) {
    throw new ValidationError('Insufficient bank balance for this transaction');
  }

  // 3. Resolve receiver user ID if existing
  const receiverHandle = await prisma.simUpiHandle.findUnique({
    where: { vpa: normalizedVpa },
  });
  const receiverId = receiverHandle?.userId || null;

  // 4. Run Risk Engine
  const risk: RiskAssessment = await computeRisk(input.senderId, normalizedVpa, amountPaisa);

  // 5. If BLOCK verdict, record blocked transaction immediately
  if (risk.verdict === RiskVerdict.BLOCK) {
    const blockedTxn = await prisma.simTransaction.create({
      data: {
        senderId: input.senderId,
        receiverVpa: normalizedVpa,
        receiverId,
        amountPaisa,
        note: input.note || null,
        status: TransactionStatus.BLOCKED,
        riskVerdict: RiskVerdict.BLOCK,
        riskScore: risk.totalScore,
        riskSignals: JSON.stringify(risk.signals),
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    console.warn('[SECURITY] Transaction blocked by Risk Engine: txnId=' + blockedTxn.id + ' score=' + risk.totalScore);

    return {
      transactionId: blockedTxn.id,
      status: TransactionStatus.BLOCKED,
      verdict: RiskVerdict.BLOCK,
      riskScore: risk.totalScore,
      signals: risk.signals,
      amountRupees: input.amountRupees,
    };
  }

  // 6. Create PENDING transaction
  const txn = await prisma.simTransaction.create({
    data: {
      senderId: input.senderId,
      receiverVpa: normalizedVpa,
      receiverId,
      amountPaisa,
      note: input.note || null,
      status: TransactionStatus.PENDING,
      riskVerdict: risk.verdict,
      riskScore: risk.totalScore,
      riskSignals: JSON.stringify(risk.signals),
      idempotencyKey: input.idempotencyKey || null,
    },
  });

  // 7. If CHALLENGE verdict, create Liveness escrow session
  let challengeSessionId: string | null = null;
  if (risk.verdict === RiskVerdict.CHALLENGE) {
    const challengeCode = generateNumericCode(4);
    const hashedCode = sha256(challengeCode);
    const expiresAt = new Date(Date.now() + ESCROW_HOLD_SECONDS * 1000);

    const session = await prisma.livenessSession.create({
      data: {
        userId: input.senderId,
        challengeCode: hashedCode,
        transactionId: txn.id,
        expiresAt,
      },
    });
    challengeSessionId = session.id;
    console.log('[ESCROW] Created escrow challenge session: sessionId=' + session.id + ' for txnId=' + txn.id);
  }

  return {
    transactionId: txn.id,
    status: txn.status,
    verdict: txn.riskVerdict,
    riskScore: txn.riskScore,
    signals: risk.signals,
    amountRupees: input.amountRupees,
    challengeSessionId,
  };
}

/**
 * Confirms payment with PIN, executing double-entry ledger debit/credit atomically.
 */
export async function confirmPayment(input: ConfirmPaymentInput) {
  if (input.pin !== SIMULATED_PIN) {
    throw new ValidationError('Incorrect UPI PIN');
  }

  const txn = await prisma.simTransaction.findUnique({
    where: { id: input.transactionId },
  });

  if (!txn) {
    throw new NotFoundError('Transaction not found');
  }

  if (txn.senderId !== input.senderId) {
    throw new ValidationError('Unauthorized to confirm this transaction');
  }

  if (txn.status !== TransactionStatus.PENDING) {
    throw new ConflictError('Transaction cannot be confirmed. Current status: ' + txn.status);
  }

  // Double-entry ledger update in atomic transaction
  const updatedTxn = await prisma.$transaction(async (tx) => {
    const senderAccount = await tx.simBankAccount.findFirst({
      where: { userId: txn.senderId, isActive: true },
    });

    if (!senderAccount || senderAccount.balancePaisa < txn.amountPaisa) {
      throw new ValidationError('Insufficient funds in account');
    }

    // Debit sender
    await tx.simBankAccount.update({
      where: { id: senderAccount.id },
      data: {
        balancePaisa: {
          decrement: txn.amountPaisa,
        },
      },
    });

    // Credit receiver if registered in system
    if (txn.receiverId) {
      const receiverAccount = await tx.simBankAccount.findFirst({
        where: { userId: txn.receiverId, isActive: true },
      });

      if (receiverAccount) {
        await tx.simBankAccount.update({
          where: { id: receiverAccount.id },
          data: {
            balancePaisa: {
              increment: txn.amountPaisa,
            },
          },
        });
      }
    }

    // Transition status to SUCCESS
    const completedTxn = await tx.simTransaction.update({
      where: { id: txn.id },
      data: {
        status: TransactionStatus.SUCCESS,
      },
    });

    // Create immutable audit Certificate (Pillar 5)
    const certPayload = {
      txId: completedTxn.id,
      senderId: completedTxn.senderId,
      receiverVpa: completedTxn.receiverVpa,
      amountPaisa: completedTxn.amountPaisa.toString(),
      timestamp: completedTxn.updatedAt.toISOString(),
      riskVerdict: completedTxn.riskVerdict,
    };
    const payloadHash = sha256(JSON.stringify(certPayload));

    await tx.certificate.create({
      data: {
        transactionId: completedTxn.id,
        payloadHash,
        jwtSignature: 'sig_' + payloadHash.slice(0, 32),
        payload: certPayload,
      },
    });

    return completedTxn;
  });

  console.log('[SUCCESS] Payment executed: txnId=' + updatedTxn.id + ' amountPaisa=' + updatedTxn.amountPaisa);

  return {
    transactionId: updatedTxn.id,
    status: updatedTxn.status,
    amountRupees: toRupees(updatedTxn.amountPaisa),
    receiverVpa: updatedTxn.receiverVpa,
    timestamp: updatedTxn.updatedAt,
  };
}

/**
 * Returns paginated transaction history for the authenticated user.
 */
export async function getPaymentHistory(userId: string, limit = 20, offset = 0) {
  const transactions = await prisma.simTransaction.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      certificate: {
        select: { id: true, payloadHash: true },
      },
    },
  });

  const total = await prisma.simTransaction.count({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
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