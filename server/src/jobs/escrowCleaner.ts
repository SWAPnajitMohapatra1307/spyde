import { LivenessVerdict, TransactionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

/**
 * Sweeps the database for expired liveness/escrow sessions and marks linked transactions as FAILED.
 */
export async function cleanExpiredEscrowSessions(): Promise<number> {
  const now = new Date();

  const expiredSessions = await prisma.livenessSession.findMany({
    where: {
      expiresAt: { lt: now },
      verdict: { notIn: [LivenessVerdict.PASS, LivenessVerdict.EXPIRED] },
      transactionId: { not: null },
    },
    include: {
      transaction: true,
    },
  });

  if (expiredSessions.length === 0) {
    return 0;
  }

  let cleanedCount = 0;

  for (const session of expiredSessions) {
    if (!session.transactionId) continue;

    try {
      await prisma.$transaction(async (tx) => {
        // Mark liveness session as EXPIRED
        await tx.livenessSession.update({
          where: { id: session.id },
          data: { verdict: LivenessVerdict.EXPIRED },
        });

        // If transaction is still PENDING, mark as FAILED
        if (session.transaction && session.transaction.status === TransactionStatus.PENDING) {
          await tx.simTransaction.update({
            where: { id: session.transactionId! },
            data: { status: TransactionStatus.FAILED },
          });

          // Log refund / timeout event in RiskEvent audit ledger
          await tx.riskEvent.create({
            data: {
              userId: session.userId,
              eventType: 'ESCROW_TIMEOUT',
              delta: 0,
              reason: 'Escrow verification challenge timed out. Transaction cancelled.',
              source: 'ESCROW',
              transactionId: session.transactionId,
            },
          });

          cleanedCount++;
        }
      });
    } catch (error: unknown) {
      console.error('[ERROR] Failed to clean expired escrow session id=' + session.id + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  return cleanedCount;
}

/**
 * Starts the periodic background cron job for escrow sweeps.
 */
export function startEscrowCleanerJob(intervalMs = 60000): NodeJS.Timeout {
  console.log('[ESCROW] Starting escrow cleanup job (interval: ' + intervalMs / 1000 + 's)...');

  const executeSweep = async () => {
    try {
      const count = await cleanExpiredEscrowSessions();
      if (count > 0) {
        console.log('[SUCCESS] Escrow cleaner swept ' + count + ' expired escrow transaction(s)');
      }
    } catch (error: unknown) {
      console.error('[ERROR] Escrow cleanup sweep failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Initial trigger followed by periodic interval
  setTimeout(executeSweep, 2000);
  return setInterval(executeSweep, intervalMs);
}