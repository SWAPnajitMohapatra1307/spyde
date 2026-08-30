// client/src/hooks/useComplaints.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export type ComplaintCategory =
  | "FRAUD"
  | "HARASSMENT"
  | "IMPERSONATION"
  | "PHISHING"
  | "NON_DELIVERY"
  | "SUSPICIOUS_BEHAVIOR"
  | "OTHER";

export type ComplaintStatus =
  | "PENDING"
  | "INVESTIGATING"
  | "RESOLVED"
  | "DISMISSED";

export interface CreateComplaintPayload {
  targetVpa: string;
  category: ComplaintCategory;
  description: string;
}

export interface ComplaintRecord {
  id: string;
  targetVpa: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MyComplaintsResponse {
  complaints: ComplaintRecord[];
  total: number;
}

export interface VpaCommunityFeedItem {
  id: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface VpaCommunityFeedResponse {
  vpa: string;
  riskScore: number;
  totalReports: number;
  complaints: VpaCommunityFeedItem[];
}

// ── Fetchers ─────────────────────────────────────────────────────────

const createComplaint = async (
  payload: CreateComplaintPayload
): Promise<ComplaintRecord> => {
  const res = await apiClient.post<ComplaintRecord>("/api/complaints", payload);
  return res.data;
};

const fetchMyComplaints = async (): Promise<MyComplaintsResponse> => {
  const res = await apiClient.get<MyComplaintsResponse>("/api/complaints/mine");
  return res.data;
};

const fetchVpaComplaints = async (
  vpa: string
): Promise<VpaCommunityFeedResponse> => {
  const res = await apiClient.get<VpaCommunityFeedResponse>(
    `/api/complaints/vpa/${encodeURIComponent(vpa)}`
  );
  return res.data;
};

// ── Hooks ────────────────────────────────────────────────────────────

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ComplaintRecord, Error, CreateComplaintPayload>({
    mutationFn: createComplaint,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["complaints", "mine"] });
    },
  });

  return {
    ...mutation,
    fileComplaint: mutation.mutate,
    fileComplaintAsync: mutation.mutateAsync,
    isFiling: mutation.isPending,
    fileError: mutation.error,
  };
};

export const useComplaints = useCreateComplaint;

export const useMyComplaints = () =>
  useQuery<MyComplaintsResponse, Error>({
    queryKey: ["complaints", "mine"],
    queryFn: fetchMyComplaints,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useVpaComplaints = (vpa: string) =>
  useQuery<VpaCommunityFeedResponse, Error>({
    queryKey: ["complaints", "vpa", vpa],
    queryFn: () => fetchVpaComplaints(vpa),
    enabled: Boolean(vpa),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });