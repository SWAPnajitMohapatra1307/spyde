// client/src/hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

// ── Existing Types ───────────────────────────────────────────────────

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
  lastFlagged: string; // ISO-8601
}

export interface AdminTopFlaggedResponse {
  topFlagged: FlaggedVpa[];
}

// ── Admin Complaints Types ───────────────────────────────────────────

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

// ── QR Tamper Logs Types ─────────────────────────────────────────────

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

// ── Network Graph / Fraud Ring Types ─────────────────────────────────

export interface NetworkNode {
  id: string;
  label: string;
  type: "VPA" | "USER" | "DEVICE" | "IP";
  riskScore: number;
  flagged: boolean;
  totalVolume?: number; // in paisa
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

// ── Fetchers ─────────────────────────────────────────────────────────

const fetchAdminStats = async (): Promise<AdminStatsResponse> => {
  const res = await apiClient.get<any>("/api/admin/stats");
  return res.data?.data || res.data;
};

const fetchTopFlagged = async (): Promise<AdminTopFlaggedResponse> => {
  const res = await apiClient.get<any>("/api/admin/top-flagged");
  return res.data?.data || res.data;
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

// ── Hooks ────────────────────────────────────────────────────────────

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