import { prisma } from '../../db/prisma';
import type { 
  AdminStatsResponse, 
  TopFlaggedResponse, 
  ModerateComplaintRequest, 
  ModerateComplaintResponse 
} from '../../types/b2';

interface TransactionSummary {
  amountPaisa: bigint;
  status: string;
  riskVerdict: string;
}

interface ComplaintGroupSummary {
  targetVpa: string;
  _count: {
    id: number;
  };
}

export class AdminService {
  async getStats(): Promise<AdminStatsResponse> {
    const [totalUsers, totalTransactions, totalComplaints, pendingComplaints, verifiedComplaints, rejectedComplaints] =
      await Promise.all([
        prisma.user.count(),
        prisma.simTransaction.count(),
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: 'PENDING' } }),
        prisma.complaint.count({ where: { status: 'VERIFIED' } }),
        prisma.complaint.count({ where: { status: 'REJECTED' } }),
      ]);

    const transactions = await prisma.simTransaction.findMany({
      select: { amountPaisa: true, status: true, riskVerdict: true },
    });

    let totalVolumePaisa = 0;
    let blockedTransactions = 0;
    let preventedLossPaisa = 0;
    let passCount = 0;
    let warnCount = 0;
    let challengeCount = 0;
    let blockCount = 0;

    transactions.forEach((tx: TransactionSummary) => {
      const amt = Number(tx.amountPaisa);
      totalVolumePaisa += amt;

      if (tx.riskVerdict === 'BLOCK' || tx.status === 'BLOCKED') {
        blockedTransactions += 1;
        preventedLossPaisa += amt;
      }

      if (tx.riskVerdict === 'PASS') passCount += 1;
      else if (tx.riskVerdict === 'WARN') warnCount += 1;
      else if (tx.riskVerdict === 'CHALLENGE') challengeCount += 1;
      else if (tx.riskVerdict === 'BLOCK') blockCount += 1;
    });

    return {
      overview: {
        totalUsers,
        totalTransactions,
        totalVolumePaisa,
        blockedTransactions,
        preventedLossPaisa,
      },
      riskMetrics: {
        passCount,
        warnCount,
        challengeCount,
        blockCount,
      },
      complaints: {
        totalFiled: totalComplaints,
        pendingReview: pendingComplaints,
        verifiedFraud: verifiedComplaints,
        rejected: rejectedComplaints,
      },
    };
  }

  async getTopFlagged(): Promise<TopFlaggedResponse> {
    const complaints = await prisma.complaint.groupBy({
      by: ['targetVpa'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topFlagged = await Promise.all(
      complaints.map(async (c: ComplaintGroupSummary) => {
        const latest = await prisma.complaint.findFirst({
          where: { targetVpa: c.targetVpa },
          orderBy: { createdAt: 'desc' },
          select: { category: true, createdAt: true },
        });

        return {
          vpa: c.targetVpa,
          complaintCount: c._count.id,
          primaryCategory: (latest?.category || 'FRAUD') as 'FRAUD',
          calculatedRiskScore: Math.min(95, c._count.id * 15),
          blockedAttempts: c._count.id * 3,
          lastActive: latest?.createdAt.toISOString() || new Date().toISOString(),
        };
      })
    );

    return { topFlagged };
  }

  async moderateComplaint(
    complaintId: string,
    payload: ModerateComplaintRequest
  ): Promise<ModerateComplaintResponse> {
    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: payload.status },
    });

    console.log('[INFO] Complaint status updated: ' + complaintId + ' to ' + payload.status);

    return {
      complaintId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      message: 'Complaint status updated successfully.',
    };
  }
}

export const adminService = new AdminService();