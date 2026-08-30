// client/src/hooks/useSafeCircle.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { SafeCircleListResponse, SafeCircleContact, ApiResponse } from '../types/app';

export const safeCircleKeys = {
  all: ['safe-circle'] as const,
  list: () => [...safeCircleKeys.all, 'list'] as const,
};

/**
 * Fetch list of Safe Circle contacts
 */
export function useSafeCircle() {
  return useQuery({
    queryKey: safeCircleKeys.list(),
    queryFn: async (): Promise<SafeCircleListResponse> => {
      const response = await apiClient.get<ApiResponse<SafeCircleListResponse>>('/api/circle');
      const payload = response.data;
      if (!payload.success) {
        throw new Error(payload.error?.message || 'Failed to fetch Safe Circle contacts');
      }
      return payload.data;
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}

/**
 * Add a contact to Safe Circle
 */
export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactData: { contactVpa: string; contactName: string }) => {
      const response = await apiClient.post<ApiResponse<SafeCircleContact>>(
        '/api/circle/add',
        contactData
      );
      const payload = response.data;
      if (!payload.success) {
        throw new Error(payload.error?.message || 'Failed to add contact');
      }
      return payload.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: safeCircleKeys.all });
    },
  });
}

/**
 * Remove a contact from Safe Circle
 */
export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(
        `/api/circle/${contactId}`
      );
      const payload = response.data;
      if (!payload.success) {
        throw new Error(payload.error?.message || 'Failed to remove contact');
      }
      return payload.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: safeCircleKeys.all });
    },
  });
}