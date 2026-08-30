import { prisma } from '../../db/prisma';
import type { 
  AdminStatsResponse, 
  TopFlaggedResponse, 
  ModerateComplaintRequest, 
  ModerateComplaintResponse 
} from '../../types/b2';
import type { ComplaintStatus } from '@prisma/client';

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

interface QrScanLogRecord {
  id: string;
  scannedBy: string | null;
  vpa: string;
  merchantId: string | null;
  verdict: string;
  deviceLat: number | null;
  deviceLng: number | null;
  merchantLat: number | null;
  merchantLng: number | null;
  distanceM: number | null;
  rawPayload: string;
  createdAt: Date;
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

  async getComplaints(limit = 50, offset = 0, status?: string) {
    const where = status ? { status: status as ComplaintStatus } : {};
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          complainant: {
            select: { phone: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.complaint.count({ where }),
    ]);

    return {
      complaints: complaints.map((c) => ({
        id: c.id,
        targetVpa: c.targetVpa,
        reporterMasked: c.complainant?.phone
          ? c.complainant.phone.slice(0, 3) + '••••' + c.complainant.phone.slice(-4)
          : 'Anonymous',
        category: c.category,
        description: c.description,
        status: c.status,
        riskScore: 75,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  // ✅ Retrieve QR Sticker Tampering Incidents
  async getTamperReports(limit = 50, offset = 0) {
    const [tampers, total] = await Promise.all([
      prisma.qrScanLog.findMany({
        where: { verdict: 'TAMPERED' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.qrScanLog.count({
        where: { verdict: 'TAMPERED' },
      }),
    ]);

    return {
      tampers: tampers.map((t: QrScanLogRecord) => ({
        id: t.id,
        scannedBy: t.scannedBy,
        vpa: t.vpa,
        merchantId: t.merchantId,
        verdict: t.verdict,
        deviceLat: t.deviceLat,
        deviceLng: t.deviceLng,
        merchantLat: t.merchantLat,
        merchantLng: t.merchantLng,
        distanceM: t.distanceM,
        rawPayload: t.rawPayload,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  // ✅ Generate Node-Edge Fraud Relationship Graph
  async getNetworkGraph() {
    const flaggedVpas = await prisma.complaint.groupBy({
      by: ['targetVpa'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const flaggedSet = new Set(flaggedVpas.map((f: ComplaintGroupSummary) => f.targetVpa));

    const transactions = await prisma.simTransaction.findMany({
      where: {
        OR: [
          { receiverVpa: { in: [...flaggedSet] } },
          { riskVerdict: { in: ['CHALLENGE', 'BLOCK'] } },
        ],
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const nodeSet = new Set<string>();
    const edges: Array<{ source: string; target: string; amount: number; verdict: string }> = [];

    for (const txn of transactions) {
      const src = txn.senderId;
      const tgt = txn.receiverVpa;
      nodeSet.add(src);
      nodeSet.add(tgt);
      edges.push({
        source: src,
        target: tgt,
        amount: Number(txn.amountPaisa) / 100,
        verdict: txn.riskVerdict,
      });
    }

    flaggedSet.forEach((vpa) => nodeSet.add(vpa));

    const nodes = [...nodeSet].map((id) => {
      const isFlagged = flaggedSet.has(id);
      const complaintCount = flaggedVpas.find((f: ComplaintGroupSummary) => f.targetVpa === id)?._count.id || 0;
      return {
        id,
        label: id,
        flagged: isFlagged,
        complaintCount,
        riskScore: isFlagged ? Math.min(95, complaintCount * 20) : 10,
        type: isFlagged ? 'FLAGGED_VPA' : 'USER',
      };
    });

    return { nodes, edges };
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