import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

import type {
  ApiSuccessResponse,
  VpaResolution,
  PaymentInitiatePayload,
  PaymentInitResult,
  PaymentConfirmPayload,
  PaymentConfirmResult,
  TransactionHistoryResponse,
} from '@/types/app';

export const useResolveVpa = () => {
  return useMutation<VpaResolution, Error, string>({
    mutationFn: async (vpa: string): Promise<VpaResolution> => {
      const response = await apiClient.post<ApiSuccessResponse<VpaResolution>>(
        '/api/vpa/resolve',
        { vpa }
      );
      return response.data.data;
    },
  });
};

export const useInitiatePayment = () => {
  return useMutation<PaymentInitResult, Error, PaymentInitiatePayload>({
    mutationFn: async (payload: PaymentInitiatePayload): Promise<PaymentInitResult> => {
      const response = await apiClient.post<ApiSuccessResponse<PaymentInitResult>>(
        '/api/payment/initiate',
        payload
      );
      return response.data.data;
    },
  });
};

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<PaymentConfirmResult, Error, PaymentConfirmPayload>({
    mutationFn: async (payload: PaymentConfirmPayload): Promise<PaymentConfirmResult> => {
      const response = await apiClient.post<ApiSuccessResponse<PaymentConfirmResult>>(
        '/api/payment/confirm',
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payment', 'history'] });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

export const useTransactionHistory = (limit: number = 10, offset: number = 0) => {
  return useQuery<TransactionHistoryResponse>({
    queryKey: ['payment', 'history', limit, offset],
    queryFn: async (): Promise<TransactionHistoryResponse> => {
      const response = await apiClient.get<ApiSuccessResponse<TransactionHistoryResponse>>(
        '/api/payment/history',
        { params: { limit, offset } }
      );
      return response.data.data;
    },
  });
};