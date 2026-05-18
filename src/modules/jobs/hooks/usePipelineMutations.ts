'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDefaultPipelineAction,
  createPipelineStageAction,
  fetchImportOptionsAction,
  fetchPipelineBoardAction,
  importPipelineAction,
} from '@/modules/jobs/api/pipelineServerActions';
import type { CreatePipelineStageInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  ImportableJobPosting,
  PipelineBoardData,
  PipelineStageRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';

function pipelineBoardKey(orgSlug: string, requisitionId: string) {
  return ['job-requisition-pipeline', orgSlug, requisitionId] as const;
}

function importOptionsKey(orgSlug: string, requisitionId: string) {
  return ['job-requisition-pipeline-import-options', orgSlug, requisitionId] as const;
}

export function usePipelineBoardQuery(orgSlug: string, memberId: string, requisitionId: string) {
  return useQuery<PipelineBoardData, Error>({
    queryKey: pipelineBoardKey(orgSlug, requisitionId),
    queryFn: () => fetchPipelineBoardAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreatePipelineStage(orgSlug: string, memberId: string, requisitionId: string) {
  const queryClient = useQueryClient();
  return useMutation<PipelineStageRecord, Error, CreatePipelineStageInput>({
    mutationFn: (data) => createPipelineStageAction({ orgSlug, memberId, requisitionId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineBoardKey(orgSlug, requisitionId) });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
    },
  });
}

export function useCreateDefaultPipeline(orgSlug: string, memberId: string, requisitionId: string) {
  const queryClient = useQueryClient();
  return useMutation<PipelineBoardData, Error>({
    mutationFn: () => createDefaultPipelineAction({ orgSlug, memberId, requisitionId }),
    onSuccess: (board) => {
      queryClient.setQueryData(pipelineBoardKey(orgSlug, requisitionId), board);
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
    },
  });
}

export function useImportPipeline(orgSlug: string, memberId: string, requisitionId: string) {
  const queryClient = useQueryClient();
  return useMutation<PipelineBoardData, Error, string>({
    mutationFn: (sourceJobPostingId) =>
      importPipelineAction({ orgSlug, memberId, requisitionId, sourceJobPostingId }),
    onSuccess: (board) => {
      queryClient.setQueryData(pipelineBoardKey(orgSlug, requisitionId), board);
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
    },
  });
}

export function useImportOptionsQuery(orgSlug: string, memberId: string, requisitionId: string) {
  return useQuery<ImportableJobPosting[], Error>({
    queryKey: importOptionsKey(orgSlug, requisitionId),
    queryFn: () => fetchImportOptionsAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
    staleTime: 60_000,
  });
}
