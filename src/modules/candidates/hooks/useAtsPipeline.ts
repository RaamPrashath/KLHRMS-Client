'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignStageInterviewsAction,
  completeInterviewMeetingAction,
  createPipelineStageAction,
  createInterviewMeetingAction,
  deletePipelineStageAction,
  extendPipelineStageAction,
  fetchCandidateApplicationDetailAction,
  fetchEvaluationWorkspaceAction,
  fetchPipelineBoardAction,
  fetchPipelineJobPostingsAction,
  fetchStageWorkspaceAction,
  generateEvaluationWorkspaceAction,
  moveApplicationStageAction,
  previewStageInterviewWarningsAction,
  searchInterviewersAction,
  updatePipelineStageAction,
} from '@/modules/candidates/api/atsServerActions';
import type {
  CandidateApplicationDetail,
  PipelineApplication,
  PipelineBoard,
  PipelineJobPosting,
  StageEvaluationWorkspace,
  InterviewMeeting,
  InterviewerSearchResponse,
  StageInterviewAssignment,
  StageInterviewAssignmentResponse,
  StageInterviewWarningResponse,
  StageWorkspace,
} from '@/modules/candidates/types/atsTypes';
import type {
  CreateInterviewMeetingInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';

function boardKey(orgSlug: string, jobPostingId: string) {
  return ['ats-pipeline', orgSlug, jobPostingId] as const;
}

function stageWorkspaceKey(orgSlug: string, stageSlug: string) {
  return ['ats-stage-workspace', orgSlug, stageSlug] as const;
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

export function useStageWorkspace(orgSlug: string, memberId: string, stageSlug: string) {
  return useQuery<StageWorkspace, Error>({
    queryKey: stageWorkspaceKey(orgSlug, stageSlug),
    queryFn: () => fetchStageWorkspaceAction({ orgSlug, memberId, stageSlug }),
    enabled: !!orgSlug && !!memberId && !!stageSlug,
    refetchInterval: 30_000,
  });
}

export function useInterviewersSearch(orgSlug: string, memberId: string, search: string) {
  return useQuery<InterviewerSearchResponse, Error>({
    queryKey: ['ats-interviewers', orgSlug, search],
    queryFn: () => searchInterviewersAction({ orgSlug, memberId, search }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
  });
}

export function usePreviewStageInterviewWarnings(
  orgSlug: string,
  memberId: string,
  stageSlug: string,
) {
  return useMutation<StageInterviewWarningResponse, Error, StageInterviewAssignment[]>({
    mutationFn: (assignments) =>
      previewStageInterviewWarningsAction({ orgSlug, memberId, stageSlug, assignments }),
  });
}

export function useAssignStageInterviews(
  orgSlug: string,
  memberId: string,
  stageSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation<StageInterviewAssignmentResponse, Error, StageInterviewAssignment[]>({
    mutationFn: (assignments) =>
      assignStageInterviewsAction({ orgSlug, memberId, stageSlug, assignments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stageWorkspaceKey(orgSlug, stageSlug) });
    },
  });
}

export function useCreateInterviewMeeting(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<InterviewMeeting, Error, { applicationId: string; data: CreateInterviewMeetingInput }>({
    mutationFn: (params) =>
      createInterviewMeetingAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        data: params.data,
      }),
    onSuccess: (_meeting, params) => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      queryClient.invalidateQueries({ queryKey: ['ats-application-detail', orgSlug, params.applicationId] });
    },
  });
}

export function useCompleteInterviewMeeting(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<InterviewMeeting, Error, { applicationId: string; eventId: string }>({
    mutationFn: (params) =>
      completeInterviewMeetingAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        eventId: params.eventId,
      }),
    onSuccess: (_meeting, params) => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      queryClient.invalidateQueries({ queryKey: ['ats-application-detail', orgSlug, params.applicationId] });
    },
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

export function useExtendPipelineStage(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) =>
      extendPipelineStageAction({ orgSlug, memberId, data: { stageId } }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
    },
  });
}

export function useEvaluationWorkspace(
  orgSlug: string,
  memberId: string,
  stageId: string | null,
) {
  return useQuery<StageEvaluationWorkspace, Error>({
    queryKey: ['ats-evaluation-workspace', orgSlug, stageId],
    queryFn: () =>
      fetchEvaluationWorkspaceAction({
        orgSlug,
        memberId,
        stageId: stageId ?? '',
      }),
    enabled: !!orgSlug && !!memberId && !!stageId,
    retry: false,
  });
}

export function useGenerateEvaluationWorkspace(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) =>
      generateEvaluationWorkspaceAction({ orgSlug, memberId, stageId }),
    onSuccess: (workspace) => {
      queryClient.setQueryData(
        ['ats-evaluation-workspace', orgSlug, workspace.stageId],
        workspace,
      );
      if (jobPostingId) {
        queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      }
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
