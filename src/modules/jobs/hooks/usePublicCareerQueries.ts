'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPublicCareerApplicationAction,
  fetchPublicCareerPostingAction,
  fetchPublicCareerPostingsAction,
} from '@/modules/jobs/api/publicCareerServerActions';
import type { PublicCareerApplicationInput } from '@/modules/jobs/schema/publicCareerSchemas';
import type {
  PublicCareerApplicationResult,
  PublicCareerPosting,
} from '@/modules/jobs/types/publicCareerTypes';

export function usePublicCareerPostingsQuery() {
  return useQuery<PublicCareerPosting[], Error>({
    queryKey: ['public-careers'],
    queryFn: () => fetchPublicCareerPostingsAction(),
  });
}

export function usePublicCareerPostingQuery(jobId: string) {
  return useQuery<PublicCareerPosting, Error>({
    queryKey: ['public-careers', jobId],
    queryFn: () => fetchPublicCareerPostingAction(jobId),
    enabled: !!jobId,
  });
}

export function usePublicCareerApplication(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation<PublicCareerApplicationResult, Error, PublicCareerApplicationInput>({
    mutationFn: (data) => createPublicCareerApplicationAction({ jobId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-careers', jobId] });
    },
  });
}
