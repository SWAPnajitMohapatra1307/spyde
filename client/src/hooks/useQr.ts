// client/src/hooks/useQr.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { QrVerifyPayload, QrVerifyResult, ApiResponse } from '../types/app';

/**
 * Verify dynamic or static UPI QR Code payload against SPYDE threat database
 */
export function useVerifyQr() {
  return useMutation({
    mutationFn: async (payload: QrVerifyPayload): Promise<QrVerifyResult> => {
      const response = await apiClient.post<ApiResponse<QrVerifyResult>>('/api/qr/verify', payload);
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error?.message || 'QR verification failed');
      }
      return data.data;
    },
  });
}