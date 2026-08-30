import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

import type { ApiSuccessResponse, User } from '@/types/app';

export const useAuth = () => {
  const query = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get<ApiSuccessResponse<User>>('/api/auth/me');
      return response.data.data;
    },
    staleTime: 60 * 1000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};