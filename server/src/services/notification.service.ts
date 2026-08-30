import { prisma } from '../db/prisma';

export interface NotificationItem {
  id: string;
  type: 'ESCROW' | 'BLOCKED' | 'COMPLAINT_UPDATE' | 'INFO';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async getNotifications(userId: string, limit = 20, offset = 0) {
    const notifications: NotificationItem[] = [];

    // 1. Pending Escrow / Liveness Challenges (User needs to complete liveness)
    const pendingSessions = await prisma.livenessSession.findMany({
      where: {
        userId,
        verdict: 'FAIL',
        expiresAt: { gt: new Date() },
      },
      include: {
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const session of pendingSessions) {
      const amountRupees = session.transaction
        ? (Number(session.transaction.amountPaisa) / 100).toFixed(2)
        : '0.00';

      notifications.push({
        id: `escrow_${session.id}`,
        type: 'ESCROW',
        title: 'Identity Verification Required',
        message: `Incoming payment of ₹${amountRupees} is held in escrow. Complete 3D face liveness challenge to release funds.`,
        read: false,
        createdAt: session.createdAt.toISOString(),
        actionUrl: `/liveness/${session.id}`,
        metadata: {
          sessionId: session.id,
          expiresAt: session.expiresAt.toISOString(),
        },
      });
    }

    // 2. Blocked Transactions (Sender notifications)
    const blockedTxns = await prisma.simTransaction.findMany({
      where: {
        senderId: userId,
        status: 'BLOCKED',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const txn of blockedTxns) {
      const amountRupees = (Number(txn.amountPaisa) / 100).toFixed(2);
      notifications.push({
        id: `blocked_${txn.id}`,
        type: 'BLOCKED',
        title: 'Payment Blocked',
        message: `Payment of ₹${amountRupees} to ${txn.receiverVpa} was blocked due to critical risk score (${txn.riskScore}/100).`,
        read: false,
        createdAt: txn.createdAt.toISOString(),
        actionUrl: `/history/${txn.id}`,
      });
    }

    // 3. Complaint Status Updates (Filed by user)
    const complaints = await prisma.complaint.findMany({
      where: {
        complainantId: userId,
        status: { in: ['VERIFIED', 'REJECTED'] },
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    for (const c of complaints) {
      notifications.push({
        id: `complaint_${c.id}`,
        type: 'COMPLAINT_UPDATE',
        title: `Complaint ${c.status}`,
        message: `Your complaint against ${c.targetVpa} has been reviewed and marked as ${c.status}.`,
        read: false,
        createdAt: c.updatedAt.toISOString(),
        actionUrl: `/complaints/mine`,
      });
    }

    // Sort descending by creation timestamp
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = notifications.slice(offset, offset + limit);

    return {
      notifications: paginated,
      total: notifications.length,
      limit,
      offset,
    };
  }

  async getUnreadCount(userId: string) {
    const [pendingCount, blockedCount, complaintCount] = await Promise.all([
      prisma.livenessSession.count({
        where: {
          userId,
          verdict: 'FAIL',
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.simTransaction.count({
        where: {
          senderId: userId,
          status: 'BLOCKED',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.complaint.count({
        where: {
          complainantId: userId,
          status: { in: ['VERIFIED', 'REJECTED'] },
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      count: pendingCount + blockedCount + complaintCount,
      breakdown: {
        escrow: pendingCount,
        blocked: blockedCount,
        complaints: complaintCount,
      },
    };
  }
}

export const notificationService = new NotificationService();