import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../stores/authStore";

export type NotificationType =
  | "PAYMENT_BLOCKED"
  | "RISK_ALERT"
  | "COMPLAINT_UPDATE"
  | "SAFE_CIRCLE"
  | "TAMPER_WARNING"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

// ── Fetchers ─────────────────────────────────────────────────────────

const fetchNotifications = async (): Promise<NotificationsResponse> => {
  const res = await apiClient.get<NotificationsResponse>("/api/notifications");
  return res.data;
};

const markNotificationAsRead = async (id: string): Promise<NotificationItem> => {
  const res = await apiClient.patch<NotificationItem>(`/api/notifications/${id}/read`);
  return res.data;
};

const markAllAsRead = async (): Promise<{ success: boolean }> => {
  const res = await apiClient.post<{ success: boolean }>("/api/notifications/read-all");
  return res.data;
};

// ── Hooks ────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<NotificationsResponse, Error>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: isAuthenticated, // Only fetch when user is logged in
    staleTime: 15_000,
    refetchInterval: isAuthenticated ? 30_000 : false, // Stop background polling when logged out
    refetchOnWindowFocus: isAuthenticated,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationItem, Error, string>({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error>({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};