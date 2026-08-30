// client/src/hooks/useCV.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  CVSessionConfig,
  CVSessionResult,
  LivenessChallengeResult,
  AntiSpoofResult,
  FaceEmbedding,
} from '@/types/cv';

interface CreateCVSessionRequest {
  transactionId: string;
  challengeCount?: number;
  antiSpoof?: boolean;
}

interface SubmitCVResultRequest {
  sessionId: string;
  challengeResults: LivenessChallengeResult[];
  antiSpoofResult: AntiSpoofResult | null;
  frames: string[];
  embedding: number[];
}

interface FaceEnrollRequest {
  frames: string[];
  embedding: number[];
}

interface FaceEnrollResponse {
  enrolled: boolean;
  faceId: string;
  quality: number;
}

interface FaceMatchRequest {
  sessionId: string;
  embedding: number[];
}

interface FaceMatchResponse {
  matched: boolean;
  similarity: number;
  threshold: number;
}

export const useCVSession = (sessionId: string | null) =>
  useQuery<CVSessionConfig>({
    queryKey: ['cv-session', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<CVSessionConfig>(
        `/api/cv/session/${sessionId}`
      );
      return data;
    },
    enabled: !!sessionId,
    staleTime: Infinity,
  });

export const useCreateCVSession = () => {
  const queryClient = useQueryClient();

  return useMutation<CVSessionConfig, Error, CreateCVSessionRequest>({
    mutationFn: async (req) => {
      const { data } = await apiClient.post<CVSessionConfig>(
        '/api/cv/session',
        req
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cv-session', data.sessionId], data);
    },
  });
};

export const useSubmitCVResult = () => {
  const queryClient = useQueryClient();

  return useMutation<CVSessionResult, Error, SubmitCVResultRequest>({
    mutationFn: async (req) => {
      const { data } = await apiClient.post<CVSessionResult>(
        `/api/cv/session/${req.sessionId}/submit`,
        req
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cv-result', data.sessionId], data);
    },
  });
};

export const useCVResult = (sessionId: string | null) =>
  useQuery<CVSessionResult>({
    queryKey: ['cv-result', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<CVSessionResult>(
        `/api/cv/session/${sessionId}/result`
      );
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const result = query.state.data;
      if (!result) return 3000;
      if (result.status === 'passed' || result.status === 'failed') return false;
      return 3000;
    },
  });

export const useEnrollFace = () =>
  useMutation<FaceEnrollResponse, Error, FaceEnrollRequest>({
    mutationFn: async (req) => {
      const { data } = await apiClient.post<FaceEnrollResponse>(
        '/api/cv/face/enroll',
        req
      );
      return data;
    },
  });

export const useMatchFace = () =>
  useMutation<FaceMatchResponse, Error, FaceMatchRequest>({
    mutationFn: async (req) => {
      const { data } = await apiClient.post<FaceMatchResponse>(
        '/api/cv/face/match',
        req
      );
      return data;
    },
  });

export const useFaceEmbedding = (faceId: string | null) =>
  useQuery<FaceEmbedding>({
    queryKey: ['face-embedding', faceId],
    queryFn: async () => {
      const { data } = await apiClient.get<FaceEmbedding>(
        `/api/cv/face/${faceId}/embedding`
      );
      return data;
    },
    enabled: !!faceId,
    staleTime: Infinity,
  });