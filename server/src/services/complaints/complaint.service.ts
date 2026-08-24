import { prisma } from '../../db/prisma';
import type { 
  ComplaintCategory, 
  ComplaintStatus, 
  FileComplaintRequest, 
  FileComplaintResponse, 
  ComplaintStatsResponse 
} from '../../types/b2';

interface ComplaintSummaryRecord {
  category: string;
  status: string;
  createdAt: Date;
}

export class ComplaintService {
  async fileComplaint(
    complainantId: string,
    payload: FileComplaintRequest
  ): Promise<FileComplaintResponse> {
    const { targetVpa, category, description, evidenceUrl, transactionId } = payload;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingComplaint = await prisma.complaint.findFirst({
      where: {
        complainantId,
        targetVpa,
        category,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (existingComplaint) {
      const error = new Error('A complaint for this category was already filed against this VPA within the last 24 hours.');
      (error as unknown as { code: string }).code = 'CONFLICT';
      throw error;
    }

    const handleRecord = await prisma.simUpiHandle.findUnique({
      where: { vpa: targetVpa },
      select: { userId: true },
    });

    const complaint = await prisma.complaint.create({
      data: {
        complainantId,
        targetVpa,
        targetUserId: handleRecord?.userId || null,
        category,
        description,
        evidenceUrl: evidenceUrl || null,
        transactionId: transactionId || null,
        status: 'PENDING',
      },
    });

    console.log('[INFO] Complaint registered: ' + complaint.id + ' against ' + targetVpa);

    return {
      complaintId: complaint.id,
      targetVpa: complaint.targetVpa,
      category: complaint.category as ComplaintCategory,
      status: complaint.status as ComplaintStatus,
      createdAt: complaint.createdAt.toISOString(),
      message: 'Complaint logged. Community fraud score updated for this handle.',
    };
  }

  async getComplaintStats(targetVpa: string): Promise<ComplaintStatsResponse> {
    const complaints = await prisma.complaint.findMany({
      where: { targetVpa },
      select: {
        category: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalComplaints = complaints.length;
    const verifiedComplaints = complaints.filter((c: ComplaintSummaryRecord) => c.status === 'VERIFIED').length;

    const breakdown: Record<ComplaintCategory, number> = {
      FRAUD: 0,
      IMPERSONATION: 0,
      SPAM: 0,
      HARASSMENT: 0,
      OTHER: 0,
    };

    complaints.forEach((c: ComplaintSummaryRecord) => {
      const cat = c.category as ComplaintCategory;
      if (breakdown[cat] !== undefined) {
        breakdown[cat] += 1;
      }
    });

    let calculatedWeight = 0;
    complaints.forEach((c: ComplaintSummaryRecord) => {
      if (c.status === 'REJECTED') return;
      const multiplier = c.status === 'VERIFIED' ? 1.5 : 1.0;
      let base = 5;
      if (c.category === 'FRAUD') base = 25;
      else if (c.category === 'IMPERSONATION') base = 20;
      else if (c.category === 'HARASSMENT') base = 10;
      calculatedWeight += base * multiplier;
    });

    const communityRiskWeight = Math.min(50, Math.round(calculatedWeight));

    return {
      targetVpa,
      totalComplaints,
      verifiedComplaints,
      breakdown,
      communityRiskWeight,
      firstReportedAt: complaints[0]?.createdAt.toISOString() || new Date().toISOString(),
      lastReportedAt: complaints[complaints.length - 1]?.createdAt.toISOString() || new Date().toISOString(),
    };
  }

  async getComplaintCount(vpa: string, days = 30): Promise<number> {
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.complaint.count({
      where: {
        targetVpa: vpa,
        status: { not: 'REJECTED' },
        createdAt: { gte: windowStart },
      },
    });
  }
}

export const complaintService = new ComplaintService();