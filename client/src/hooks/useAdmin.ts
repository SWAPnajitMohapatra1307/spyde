import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

export interface AdminOverview {
  totalTransactions: number;
  totalVolume: number; // in paisa
  successfulTransactions: number;
  blockedTransactions: number;
}

export interface AdminRiskMetrics {
  passRate: number;
  warnRate: number;
  challengeRate: number;
  blockRate: number;
}

export interface AdminComplaintsSummary {
  total: number;
  open: number;
  resolved: number;
}

export interface AdminStatsResponse {
  overview: AdminOverview;
  riskMetrics: AdminRiskMetrics;
  complaints: AdminComplaintsSummary;
}

export interface FlaggedVpa {
  vpa: string;
  reportCount: number;
  riskScore: number;
  blockedAttempts: number;
  lastFlagged: string;
}

export interface AdminTopFlaggedResponse {
  topFlagged: FlaggedVpa[];
}

export type ComplaintStatus = "PENDING" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export interface AdminComplaintRecord {
  id: string;
  targetVpa: string;
  reporterMasked?: string;
  category: "IMPERSONATION" | "PHISHING" | "NON_DELIVERY" | "SUSPICIOUS_BEHAVIOR" | "OTHER";
  description: string;
  status: ComplaintStatus;
  riskScore?: number;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminComplaintsResponse {
  complaints: AdminComplaintRecord[];
  total: number;
}

export interface UpdateComplaintPayload {
  complaintId: string;
  status: ComplaintStatus;
  resolutionNotes?: string;
}

export interface TamperLog {
  id: string;
  originalVpa: string;
  tamperedVpa: string;
  qrPayload: string;
  detectionType: "OVERLAY_MISMATCH" | "MALICIOUS_PAYLOAD" | "CHECKSUM_FAIL" | "UNREGISTERED_ORIGIN";
  riskScore: number;
  actionTaken: "BLOCKED" | "FLAGGED" | "CHALLENGED";
  location?: string;
  detectedAt: string;
}

export interface AdminTampersResponse {
  tampers: TamperLog[];
  total: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: "VPA" | "USER" | "DEVICE" | "IP";
  riskScore: number;
  flagged: boolean;
  totalVolume?: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  relation: "TRANSACTION" | "SHARED_DEVICE" | "SHARED_IP" | "COMPLAINT";
  weight: number;
}

export interface AdminNetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

const fetchAdminStats = async (): Promise<AdminStatsResponse> => {
  const res = await apiClient.get<any>("/api/admin/stats");
  const raw = res.data?.data || res.data || {};
  return {
    overview: {
      totalTransactions: raw.overview?.totalTransactions ?? 0,
      totalVolume: raw.overview?.totalVolume ?? raw.overview?.totalVolumePaisa ?? 0,
      successfulTransactions: raw.overview?.successfulTransactions ?? 0,
      blockedTransactions: raw.overview?.blockedTransactions ?? 0,
    },
    riskMetrics: {
      passRate: raw.riskMetrics?.passRate ?? 0,
      warnRate: raw.riskMetrics?.warnRate ?? 0,
      challengeRate: raw.riskMetrics?.challengeRate ?? 0,
      blockRate: raw.riskMetrics?.blockRate ?? 0,
    },
    complaints: {
      total: raw.complaints?.total ?? raw.complaints?.totalFiled ?? 0,
      open: raw.complaints?.open ?? raw.complaints?.pendingReview ?? 0,
      resolved: raw.complaints?.resolved ?? raw.complaints?.verifiedFraud ?? 0,
    },
  };
};

const fetchTopFlagged = async (): Promise<AdminTopFlaggedResponse> => {
  const res = await apiClient.get<any>("/api/admin/top-flagged");
  const rawList = res.data?.data?.topFlagged || res.data?.topFlagged || [];
  const topFlagged: FlaggedVpa[] = rawList.map((item: any) => {
    const rawScore = item.riskScore ?? (item.calculatedRiskScore ? item.calculatedRiskScore / 100 : 0);
    return {
      vpa: item.vpa || "unknown@spyde",
      reportCount: item.reportCount ?? item.complaintCount ?? 0,
      riskScore: rawScore > 1 ? rawScore / 100 : rawScore,
      blockedAttempts: item.blockedAttempts ?? 0,
      lastFlagged: item.lastFlagged || item.lastActive || new Date().toISOString(),
    };
  });
  return { topFlagged };
};

const fetchAdminComplaints = async (): Promise<AdminComplaintsResponse> => {
  const res = await apiClient.get<any>("/api/admin/complaints");
  return res.data?.data || res.data;
};

const updateComplaintStatus = async (
  payload: UpdateComplaintPayload
): Promise<AdminComplaintRecord> => {
  const res = await apiClient.patch<any>(
    `/api/admin/complaints/${payload.complaintId}`,
    {
      status: payload.status,
      resolutionNotes: payload.resolutionNotes,
    }
  );
  return res.data?.data || res.data;
};

const fetchAdminTampers = async (): Promise<AdminTampersResponse> => {
  const res = await apiClient.get<any>("/api/admin/tampers");
  return res.data?.data || res.data;
};

const fetchAdminNetwork = async (): Promise<AdminNetworkResponse> => {
  const res = await apiClient.get<any>("/api/admin/network");
  return res.data?.data || res.data;
};

export const useAdminStats = () =>
  useQuery<AdminStatsResponse, Error>({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useTopFlagged = () =>
  useQuery<AdminTopFlaggedResponse, Error>({
    queryKey: ["admin", "top-flagged"],
    queryFn: fetchTopFlagged,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

export const useAdminComplaints = () =>
  useQuery<AdminComplaintsResponse, Error>({
    queryKey: ["admin", "complaints"],
    queryFn: fetchAdminComplaints,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useUpdateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation<AdminComplaintRecord, Error, UpdateComplaintPayload>({
    mutationFn: updateComplaintStatus,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
};

export const useAdminTampers = () =>
  useQuery<AdminTampersResponse, Error>({
    queryKey: ["admin", "tampers"],
    queryFn: fetchAdminTampers,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  });

export const useAdminNetwork = () =>
  useQuery<AdminNetworkResponse, Error>({
    queryKey: ["admin", "network"],
    queryFn: fetchAdminNetwork,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });