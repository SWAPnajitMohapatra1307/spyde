// client/src/hooks/useLiveness.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type {
  LivenessChallengeResponse,
  LivenessVerifyPayload,
  LivenessVerifyResult,
  PendingEscrowItem,
  ApiResponse,
} from '../types/app';

export const livenessKeys = {
  all: ['liveness'] as const,
  challenge: () => [...livenessKeys.all, 'challenge'] as const,
  pending: () => [...livenessKeys.all, 'pending'] as const,
};

/**
 * Request an active server-side liveness challenge code
 */
export function useLivenessChallenge() {
  return useQuery({
    queryKey: livenessKeys.challenge(),
    queryFn: async (): Promise<LivenessChallengeResponse> => {
      const response = await apiClient.post<ApiResponse<LivenessChallengeResponse>>(
        '/api/liveness/challenge'
      );
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to initialize liveness challenge');
      }
      return data.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/**
 * Submit verified biometric payload to SPYDE middleware
 */
export function useVerifyLiveness() {
  return useMutation({
    mutationFn: async (payload: LivenessVerifyPayload): Promise<LivenessVerifyResult> => {
      const response = await apiClient.post<ApiResponse<LivenessVerifyResult>>(
        '/api/liveness/verify',
        payload
      );
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error?.message || 'Liveness verification failed');
      }
      return data.data;
    },
  });
}

/**
 * Fetch pending escrow transactions awaiting biometric verification
 */
export function usePendingEscrow() {
  return useQuery({
    queryKey: livenessKeys.pending(),
    queryFn: async (): Promise<PendingEscrowItem[]> => {
      try {
        const response = await apiClient.get<ApiResponse<PendingEscrowItem[]>>(
          '/api/liveness/pending'
        );
        if (response.data.success) {
          return response.data.data;
        }
        return [];
      } catch {
        return [
          {
            id: 'esc_101',
            transactionId: 'tx_demo_escrow_882',
            senderName: 'Account Owner',
            senderVpa: 'user@spyde',
            amountRupees: 15000,
            expiresAt: new Date(Date.now() + 180 * 1000).toISOString(),
            ttlSeconds: 180,
          },
        ];
      }
    },
    staleTime: 1000 * 30,
  });
}