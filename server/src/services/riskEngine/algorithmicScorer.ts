import { prisma } from '../../db/prisma';
import { detectTypo } from './typoDetector';

export interface AlgorithmicScoreResult {
  score: number;
  signals: Array<{ type: string; weight: number; reason: string }>;
}

/**
 * Computes Layer 1 algorithmic fraud indicators (Max 55 points).
 */
export async function computeAlgorithmicScore(
  senderId: string,
  receiverVpa: string,
  amountPaisa: bigint
): Promise<AlgorithmicScoreResult> {
  let score = 0;
  const signals: Array<{ type: string; weight: number; reason: string }> = [];

  // 1. Typo / Handle Spoofing Detection (Max 25 pts)
  const typoResult = detectTypo(receiverVpa);
  if (typoResult.isTypo && typoResult.reason) {
    score += typoResult.score;
    signals.push({
      type: 'TYPO_DETECTED',
      weight: typoResult.score,
      reason: typoResult.reason,
    });
  }

  // 2. Account Age Verification (Max 10 pts)
  const receiverHandle = await prisma.simUpiHandle.findUnique({
    where: { vpa: receiverVpa.toLowerCase().trim() },
    include: { user: true },
  });

  if (receiverHandle?.user) {
    const ageInDays = (Date.now() - new Date(receiverHandle.user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) {
      score += 10;
      signals.push({
        type: 'NEW_ACCOUNT',
        weight: 10,
        reason: 'Receiver account was created less than 7 days ago (' + Math.round(ageInDays) + ' days old)',
      });
    } else if (ageInDays < 30) {
      score += 5;
      signals.push({
        type: 'RECENT_ACCOUNT',
        weight: 5,
        reason: 'Receiver account was created less than 30 days ago',
      });
    }
  }

  // 3. Velocity / Burst Detection (Max 10 pts)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentTxnCount = await prisma.simTransaction.count({
    where: {
      senderId,
      createdAt: { gte: tenMinutesAgo },
    },
  });

  if (recentTxnCount >= 3) {
    score += 10;
    signals.push({
      type: 'HIGH_VELOCITY',
      weight: 10,
      reason: 'Sender initiated ' + (recentTxnCount + 1) + ' transactions within 10 minutes',
    });
  }

  // 4. Amount Anomaly Spike (Max 10 pts)
  const amountRupees = Number(amountPaisa) / 100;
  if (amountRupees >= 50000) {
    score += 10;
    signals.push({
      type: 'HIGH_VALUE_TXN',
      weight: 10,
      reason: 'High transaction amount exceeding INR 50,000 (INR ' + amountRupees.toFixed(2) + ')',
    });
  } else if (amountRupees >= 20000) {
    score += 5;
    signals.push({
      type: 'ELEVATED_VALUE_TXN',
      weight: 5,
      reason: 'Elevated transaction amount exceeding INR 20,000',
    });
  }

  const boundedScore = Math.min(score, 55);

  return {
    score: boundedScore,
    signals,
  };
}