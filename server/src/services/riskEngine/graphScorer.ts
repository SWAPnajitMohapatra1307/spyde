import { prisma } from '../../db/prisma';
import { RiskVerdict, TransactionStatus } from '@prisma/client';

export interface GraphScoreResult {
  score: number;
  signals: Array<{ type: string; weight: number; reason: string }>;
}

export async function computeGraphScore(receiverVpa: string): Promise<GraphScoreResult> {
  const normalizedVpa = receiverVpa.toLowerCase().trim();

  const handle = await prisma.simUpiHandle.findUnique({
    where: { vpa: normalizedVpa },
  });

  if (!handle) {
    return { score: 0, signals: [] };
  }

  const directFlaggedTxnCount = await prisma.simTransaction.count({
    where: {
      AND: [
        {
          OR: [
            { senderId: handle.userId },
            { receiverId: handle.userId },
          ],
        },
        {
          OR: [
            { riskVerdict: RiskVerdict.BLOCK },
            { status: TransactionStatus.BLOCKED },
          ],
        },
      ],
    },
  });

  if (directFlaggedTxnCount > 0) {
    return {
      score: 15,
      signals: [
        {
          type: 'GRAPH_DIRECT_ADJACENCY',
          weight: 15,
          reason: 'Receiver has ' + directFlaggedTxnCount + ' direct transaction link(s) with flagged fraud accounts',
        },
      ],
    };
  }

  const intermediaryTxns = await prisma.simTransaction.findMany({
    where: {
      OR: [
        { senderId: handle.userId },
        { receiverId: handle.userId },
      ],
    },
    select: { senderId: true, receiverId: true },
    take: 10,
  });

  const neighborUserIds = new Set<string>();
  for (const txn of intermediaryTxns) {
    if (txn.senderId && txn.senderId !== handle.userId) neighborUserIds.add(txn.senderId);
    if (txn.receiverId && txn.receiverId !== handle.userId) neighborUserIds.add(txn.receiverId);
  }

  if (neighborUserIds.size > 0) {
    const secondHopFlagged = await prisma.simTransaction.count({
      where: {
        AND: [
          {
            OR: [
              { senderId: { in: Array.from(neighborUserIds) } },
              { receiverId: { in: Array.from(neighborUserIds) } },
            ],
          },
          {
            riskVerdict: RiskVerdict.BLOCK,
          },
        ],
      },
    });

    if (secondHopFlagged > 0) {
      return {
        score: 10,
        signals: [
          {
            type: 'GRAPH_INDIRECT_ADJACENCY',
            weight: 10,
            reason: 'Receiver is connected (2-hop) to previously blocked fraudulent entities',
          },
        ],
      };
    }
  }

  return { score: 0, signals: [] };
}