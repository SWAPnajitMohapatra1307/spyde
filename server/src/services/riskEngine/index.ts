import { RiskVerdict } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { redis } from '../../lib/redis';
import { isInSafeCircle } from '../safeCircleService';
import { computeAlgorithmicScore } from './algorithmicScorer';
import { computeCommunityScore } from './communityScorer';
import { computeGraphScore } from './graphScorer';

export interface RiskSignal {
  type: string;
  weight: number;
  reason: string;
}

export interface RiskAssessment {
  verdict: RiskVerdict;
  totalScore: number;
  signals: RiskSignal[];
  isSafeCircleBypass: boolean;
  breakdown: {
    algorithmicScore: number;
    communityScore: number;
    graphScore: number;
  };
}

/**
 * Maps numeric composite risk score (0-100) to standard RiskVerdict enum.
 */
export function getVerdictFromScore(score: number): RiskVerdict {
  if (score >= 90) return RiskVerdict.BLOCK;
  if (score >= 75) return RiskVerdict.CHALLENGE;
  if (score >= 50) return RiskVerdict.WARN;
  return RiskVerdict.PASS;
}

/**
 * Main Risk Engine computation orchestrator (Pillar 1).
 */
export async function computeRisk(
  senderId: string,
  receiverVpa: string,
  amountPaisa: bigint
): Promise<RiskAssessment> {
  const normalizedVpa = receiverVpa.toLowerCase().trim();

  // 1. Safe Circle Sub-10ms Fast Path (Pillar 4 Bypass)
  const isWhitelisted = await isInSafeCircle(senderId, normalizedVpa);
  if (isWhitelisted) {
    console.log('[PERF] Safe Circle fast-path triggered (<10ms) for receiver=' + normalizedVpa);
    return {
      verdict: RiskVerdict.PASS,
      totalScore: 0,
      signals: [
        {
          type: 'SAFE_CIRCLE_WHITELIST',
          weight: 0,
          reason: 'Receiver is in sender Safe Circle whitelist. Risk analysis bypassed.',
        },
      ],
      isSafeCircleBypass: true,
      breakdown: {
        algorithmicScore: 0,
        communityScore: 0,
        graphScore: 0,
      },
    };
  }

  // Check Redis reputation cache
  const cacheKey = 'reputation:' + normalizedVpa;
  const cachedReputation = await redis.get(cacheKey);
  let baseCommunityScore = 0;

  if (cachedReputation) {
    baseCommunityScore = parseInt(cachedReputation, 10) || 0;
  }

  // 2. Parallel Scoring Layers Execution
  const [algoResult, communityResult, graphResult] = await Promise.all([
    computeAlgorithmicScore(senderId, normalizedVpa, amountPaisa),
    baseCommunityScore > 0 ? { score: baseCommunityScore, signals: [] } : computeCommunityScore(normalizedVpa),
    computeGraphScore(normalizedVpa),
  ]);

  if (!cachedReputation && communityResult.score > 0) {
    await redis.set(cacheKey, communityResult.score.toString(), 'EX', 300); // 5-minute cache TTL
  }

  const allSignals: RiskSignal[] = [
    ...algoResult.signals,
    ...communityResult.signals,
    ...graphResult.signals,
  ];

  const totalScore = Math.min(
    algoResult.score + communityResult.score + graphResult.score,
    100
  );

  const verdict = getVerdictFromScore(totalScore);

  // Log Risk Event asynchronously for audit compliance
  try {
    await prisma.riskEvent.create({
      data: {
        userId: senderId,
        eventType: 'TRANSACTION_EVALUATED',
        delta: totalScore,
        reason: 'Risk evaluated for payment to ' + normalizedVpa + ': ' + verdict,
        source: totalScore >= 75 ? 'ALGO_COMMUNITY' : 'ALGO',
      },
    });
  } catch (error: unknown) {
    console.error('[ERROR] Failed to record RiskEvent log: ' + (error instanceof Error ? error.message : String(error)));
  }

  console.log('[PERF] Risk evaluation completed: receiver=' + normalizedVpa + ' score=' + totalScore + ' verdict=' + verdict);

  return {
    verdict,
    totalScore,
    signals: allSignals,
    isSafeCircleBypass: false,
    breakdown: {
      algorithmicScore: algoResult.score,
      communityScore: communityResult.score,
      graphScore: graphResult.score,
    },
  };
}