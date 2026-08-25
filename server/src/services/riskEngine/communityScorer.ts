import { prisma } from '../../db/prisma';
import { ComplaintCategory, ComplaintStatus } from '@prisma/client';

export interface CommunityScoreResult {
  score: number;
  signals: Array<{ type: string; weight: number; reason: string }>;
}

const CATEGORY_WEIGHTS: Record<ComplaintCategory, number> = {
  FRAUD: 25,
  IMPERSONATION: 20,
  HARASSMENT: 10,
  SPAM: 5,
  OTHER: 5,
};

const DECAY_HALF_LIFE_DAYS = 30; // Weight halves every 30 days

/**
 * Computes Layer 2 community fraud score based on user-filed complaints with time decay (Max 50 points).
 */
export async function computeCommunityScore(targetVpa: string): Promise<CommunityScoreResult> {
  const normalizedVpa = targetVpa.toLowerCase().trim();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const complaints = await prisma.complaint.findMany({
    where: {
      targetVpa: normalizedVpa,
      status: { not: ComplaintStatus.REJECTED },
      createdAt: { gte: ninetyDaysAgo },
    },
  });

  if (complaints.length === 0) {
    return { score: 0, signals: [] };
  }

  let totalWeightedScore = 0;
  const signals: Array<{ type: string; weight: number; reason: string }> = [];

  for (const complaint of complaints) {
    const baseWeight = CATEGORY_WEIGHTS[complaint.category] || 5;
    const statusMultiplier = complaint.status === ComplaintStatus.VERIFIED ? 1.5 : 1.0;

    const daysOld = (Date.now() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const timeDecayFactor = Math.pow(0.5, daysOld / DECAY_HALF_LIFE_DAYS);

    const calculatedWeight = Math.round(baseWeight * statusMultiplier * timeDecayFactor);

    if (calculatedWeight > 0) {
      totalWeightedScore += calculatedWeight;
    }
  }

  const boundedScore = Math.min(totalWeightedScore, 50);

  if (boundedScore > 0) {
    signals.push({
      type: 'COMMUNITY_REPORTS',
      weight: boundedScore,
      reason: complaints.length + ' active community complaint(s) filed against this VPA within 90 days',
    });
  }

  return {
    score: boundedScore,
    signals,
  };
}