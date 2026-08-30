import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';
import type { RiskVerdict, Transaction } from '@/types/app';

export interface TransactionHistoryQueryParams {
  limit?: number;
  offset?: number;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface UseTransactionHistoryOptions {
  limit?: number;
  offset?: number;
  verdictFilter?: RiskVerdict | 'ALL';
  searchQuery?: string;
}

async function fetchTransactionHistory(
  params: TransactionHistoryQueryParams,
): Promise<TransactionHistoryResponse> {
  const res = await apiClient.get<any>(
    '/api/payment/history',
    {
      params: {
        limit: params.limit ?? 10,
        offset: params.offset ?? 0,
      },
    },
  );
  return res.data?.data || res.data;
}

export function useTransactionHistory(options: UseTransactionHistoryOptions = {}) {
  const { limit = 10, offset = 0, verdictFilter = 'ALL', searchQuery = '' } = options;

  const query = useQuery({
    queryKey: ['payment', 'history', limit, offset],
    queryFn: () => fetchTransactionHistory({ limit, offset }),
    staleTime: 30000,
  });

  const rawTransactions = query.data?.transactions ?? [];

  const filteredTransactions = rawTransactions.filter((tx) => {
    const matchesVerdict =
      verdictFilter === 'ALL' || tx.riskVerdict === verdictFilter;

    const queryLower = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !queryLower ||
      (tx.receiverVpa && tx.receiverVpa.toLowerCase().includes(queryLower)) ||
      (tx.receiverName && tx.receiverName.toLowerCase().includes(queryLower)) ||
      (tx.id && tx.id.toLowerCase().includes(queryLower));

    return matchesVerdict && matchesSearch;
  });

  return {
    transactions: filteredTransactions,
    rawTransactions,
    total: query.data?.total ?? 0,
    limit: query.data?.limit ?? limit,
    offset: query.data?.offset ?? offset,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  } as const;
}