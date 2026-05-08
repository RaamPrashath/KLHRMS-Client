'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPipelineStageAction,
  deletePipelineStageAction,
  fetchCandidateApplicationDetailAction,
  fetchPipelineBoardAction,
  fetchPipelineJobPostingsAction,
  moveApplicationStageAction,
  updatePipelineStageAction,
} from '@/modules/candidates/api/atsServerActions';
import type {
  CandidateApplicationDetail,
  PipelineApplication,
  PipelineBoard,
  PipelineJobPosting,
} from '@/modules/candidates/types/atsTypes';
import type {
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';

function boardKey(orgSlug: string, jobPostingId: string) {
  return ['ats-pipeline', orgSlug, jobPostingId] as const;
}

function moveApplicationInBoard(
  board: PipelineBoard,
  applicationId: string,
  toStageId: string,
): PipelineBoard {
  let moved: PipelineApplication | null = null;
  const fromStage = board.stages.find((stage) =>
    stage.applications.some((application) => application.id === applicationId),
  );
  const targetStage = board.stages.find((stage) => stage.id === toStageId);
  if (!fromStage || !targetStage || fromStage.id === toStageId) return board;

  const stages = board.stages.map((stage) => {
    if (stage.id === fromStage.id) {
      const applications = stage.applications.filter((application) => {
        if (application.id === applicationId) {
          moved = application;
          return false;
        }
        return true;
      });
      return { ...stage, applications };
    }
    return stage;
  });

  if (!moved) return board;

  return {
    ...board,
    stages: stages.map((stage) => {
      if (stage.id !== toStageId || moved === null) return stage;
      return {
        ...stage,
        applications: [
          {
            ...moved,
            pipelineStageId: targetStage.id,
            currentStage: targetStage.name,
          },
          ...stage.applications,
        ],
      };
    }),
  };
}

export function usePipelineJobPostings(orgSlug: string, memberId: string) {
  return useQuery<PipelineJobPosting[], Error>({
    queryKey: ['ats-pipeline-postings', orgSlug],
    queryFn: () => fetchPipelineJobPostingsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function usePipelineBoard(orgSlug: string, memberId: string, jobPostingId: string | null) {
  return useQuery<PipelineBoard, Error>({
    queryKey: jobPostingId ? boardKey(orgSlug, jobPostingId) : ['ats-pipeline', orgSlug, 'none'],
    queryFn: () => fetchPipelineBoardAction({ orgSlug, memberId, jobPostingId: jobPostingId ?? '' }),
    enabled: !!orgSlug && !!memberId && !!jobPostingId,
    refetchInterval: 30_000,
  });
}

export function useCandidateApplicationDetail(
  orgSlug: string,
  memberId: string,
  applicationId: string | null,
) {
  return useQuery<CandidateApplicationDetail, Error>({
    queryKey: ['ats-application-detail', orgSlug, applicationId],
    queryFn: () =>
      fetchCandidateApplicationDetailAction({
        orgSlug,
        memberId,
        applicationId: applicationId ?? '',
      }),
    enabled: !!orgSlug && !!memberId && !!applicationId,
  });
}

export function useMoveApplicationStage(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; toStageId: string }) =>
      moveApplicationStageAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        data: { toStageId: params.toStageId },
      }),
    onMutate: (params) => {
      if (!jobPostingId) return { previous: undefined };
      const key = boardKey(orgSlug, jobPostingId);
      const previous = queryClient.getQueryData<PipelineBoard>(key);
      if (previous) {
        queryClient.setQueryData<PipelineBoard>(
          key,
          moveApplicationInBoard(previous, params.applicationId, params.toStageId),
        );
      }
      void queryClient.cancelQueries({ queryKey: key });
      return { previous };
    },
    onError: (_error, _params, context) => {
      if (jobPostingId && context?.previous) {
        queryClient.setQueryData(boardKey(orgSlug, jobPostingId), context.previous);
      }
    },
    onSettled: () => {
      if (jobPostingId) {
        queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      }
    },
  });
}

export function useCreatePipelineStage(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePipelineStageInput) => createPipelineStageAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
    },
  });
}

export function useUpdatePipelineStage(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { stageId: string; data: UpdatePipelineStageInput }) =>
      updatePipelineStageAction({ orgSlug, memberId, stageId: params.stageId, data: params.data }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
    },
  });
}

export function useDeletePipelineStage(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => deletePipelineStageAction({ orgSlug, memberId, stageId }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
    },
  });
}
