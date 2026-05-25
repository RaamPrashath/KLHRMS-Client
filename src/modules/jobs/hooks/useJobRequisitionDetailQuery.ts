'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchJobRequisitionDetailAction,
  fetchRequisitionAiAnalysisAction,
  fetchRequisitionActivityAction,
  rebuildRequisitionAiAnalysisAction,
} from '@/modules/jobs/api/jobRequisitionDetailActions';
import type {
  JobRequisitionAiAnalysis,
  JobRequisitionRecord,
  RequisitionActivityEntry,
} from '@/modules/jobs/types/jobRequisitionTypes';

export function useJobRequisitionDetailQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<JobRequisitionRecord, Error>({
    queryKey: ['job-requisition-detail', orgSlug, requisitionId],
    queryFn: () => fetchJobRequisitionDetailAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
  });
}

export function useRequisitionActivityQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<RequisitionActivityEntry[], Error>({
    queryKey: ['job-requisition-activity', orgSlug, requisitionId],
    queryFn: () => fetchRequisitionActivityAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
  });
}

function requisitionAiAnalysisKey(orgSlug: string, requisitionId: string) {
  return ['job-requisition-ai-analysis', orgSlug, requisitionId] as const;
}

export function useRequisitionAiAnalysisQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<JobRequisitionAiAnalysis, Error>({
    queryKey: requisitionAiAnalysisKey(orgSlug, requisitionId),
    queryFn: () => fetchRequisitionAiAnalysisAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
    staleTime: 30_000,
  });
}

export function useRebuildRequisitionAiAnalysis(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation<JobRequisitionAiAnalysis, Error>({
    mutationFn: () => rebuildRequisitionAiAnalysisAction({ orgSlug, memberId, requisitionId }),
    onSuccess: (analysis) => {
      queryClient.setQueryData(requisitionAiAnalysisKey(orgSlug, requisitionId), analysis);
      queryClient.invalidateQueries({ queryKey: ['job-requisition-detail', orgSlug, requisitionId] });
    },
  });
}
