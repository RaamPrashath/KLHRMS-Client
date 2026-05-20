'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptInterviewAction,
  addHiringTeamMemberAction,
  assignStageInterviewsAction,
  completeInterviewMeetingAction,
  completeStageAction,
  createCandidateApplicationNoteAction,
  deleteEmployeeAction,
  moveInterviewAssignmentAction,
  previewEmployeeDeleteAction,
  reopenStageAction,
  createPipelineStageAction,
  createInterviewMeetingAction,
  startInterviewMeetingAction,
  updateInterviewMeetingAction,
  createReassignmentRequestAction,
  deletePipelineStageAction,
  distributeStageInterviewsAction,
  extendPipelineStageAction,
  fetchCandidateApplicationDetailAction,
  fetchEvaluationWorkspaceAction,
  fetchHiringTeamsAction,
  fetchMyInterviewsAction,
  fetchPipelineBoardAction,
  fetchPipelineBoardByJobSlugAction,
  fetchPipelineJobPostingsAction,
  fetchStageWorkspaceAction,
  fetchStageWorkspaceByJobSlugAction,
  createHiringTeamAction,
  generateEvaluationWorkspaceAction,
  moveApplicationStageAction,
  previewStageInterviewWarningsAction,
  removeHiringTeamMemberAction,
  rejectInterviewAction,
  reshuffleInterviewAssignmentAction,
  searchInterviewersAction,
  updateCandidateApplicationDetailAction,
  updateCandidateApplicationNoteAction,
  updatePipelineStageAction,
} from '@/modules/candidates/api/atsServerActions';
import type {
  CandidateApplicationDetail,
  AcceptInterviewResponse,
  MyInterviewListResponse,
  PipelineApplication,
  PipelineBoard,
  PipelineJobPosting,
  PipelineStage,
  StageEvaluationWorkspace,
  InterviewMeeting,
  InterviewerSearchResponse,
  ReshuffleRequest,
  ReshuffleResponse,
  RejectInterviewResponse,
  StageInterviewAssignment,
  StageInterviewAssignmentResponse,
  StageInterviewWarningResponse,
  StageWorkspace,
  TeamDistributionRequest,
  TeamDistributionResponse,
} from '@/modules/candidates/types/atsTypes';
import type {
  CreateInterviewMeetingInput,
  UpdateInterviewMeetingInput,
  AcceptInterviewInput,
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
            lastMovedAt: new Date().toISOString(),
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
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function usePipelineBoard(orgSlug: string, memberId: string, jobPostingId: string | null) {
  return useQuery<PipelineBoard, Error>({
    queryKey: jobPostingId ? boardKey(orgSlug, jobPostingId) : ['ats-pipeline', orgSlug, 'none'],
    queryFn: () => fetchPipelineBoardAction({ orgSlug, memberId, jobPostingId: jobPostingId ?? '' }),
    enabled: !!orgSlug && !!memberId && !!jobPostingId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 30_000,
  });
}

export function usePipelineBoardByJobSlug(orgSlug: string, memberId: string, jobSlug: string | null) {
  return useQuery<PipelineBoard, Error>({
    queryKey: jobSlug ? ['ats-pipeline-job-slug', orgSlug, jobSlug] : ['ats-pipeline-job-slug', orgSlug, 'none'],
    queryFn: () => fetchPipelineBoardByJobSlugAction({ orgSlug, memberId, jobSlug: jobSlug ?? '' }),
    enabled: !!orgSlug && !!memberId && !!jobSlug,
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

export function useUpdateCandidateApplicationDetail(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      applicationId: string;
      data: { internalNotes?: string | null; rating?: number | null; resumeUrl?: string | null };
    }) =>
      updateCandidateApplicationDetailAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        data: params.data,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['ats-application-detail', orgSlug, data.id], data);
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useCreateCandidateApplicationNote(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; body: string }) =>
      createCandidateApplicationNoteAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        body: params.body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['ats-application-detail', orgSlug, data.id], data);
    },
  });
}

export function useUpdateCandidateApplicationNote(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; noteId: string; body: string }) =>
      updateCandidateApplicationNoteAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        noteId: params.noteId,
        body: params.body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['ats-application-detail', orgSlug, data.id], data);
    },
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

export function useStageWorkspaceByJobSlug(
  orgSlug: string,
  memberId: string,
  jobSlug: string | null,
  stageSlug: string | null,
) {
  return useQuery<StageWorkspace, Error>({
    queryKey: ['ats-stage-workspace-job-slug', orgSlug, jobSlug, stageSlug],
    queryFn: () =>
      fetchStageWorkspaceByJobSlugAction({
        orgSlug,
        memberId,
        jobSlug: jobSlug ?? '',
        stageSlug: stageSlug ?? '',
      }),
    enabled: !!orgSlug && !!memberId && !!jobSlug && !!stageSlug,
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
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug] });
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

export function useUpdateInterviewMeeting(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<InterviewMeeting, Error, { applicationId: string; eventId: string; data: UpdateInterviewMeetingInput }>({
    mutationFn: (params) =>
      updateInterviewMeetingAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        eventId: params.eventId,
        data: params.data,
      }),
    onSuccess: (_meeting, params) => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      queryClient.invalidateQueries({ queryKey: ['ats-application-detail', orgSlug, params.applicationId] });
    },
  });
}

export function useStartInterviewMeeting(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<InterviewMeeting, Error, { applicationId: string; eventId: string }>({
    mutationFn: (params) =>
      startInterviewMeetingAction({
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

export function useCompleteInterviewMeeting(
  orgSlug: string,
  memberId: string,
  jobPostingId: string | null,
) {
  const queryClient = useQueryClient();
  type CompleteInterviewVariables = {
    applicationId: string;
    eventId: string;
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    };
  };
  type CompleteInterviewContext = {
    previousBoard?: PipelineBoard;
    boardQueryKey?: ReturnType<typeof boardKey>;
  };
  return useMutation<InterviewMeeting, Error, CompleteInterviewVariables, CompleteInterviewContext>({
    mutationFn: (params) =>
      completeInterviewMeetingAction({
        orgSlug,
        memberId,
        applicationId: params.applicationId,
        eventId: params.eventId,
        data: params.data,
      }),
    onMutate: async (params) => {
      const boardQueryKey = jobPostingId ? boardKey(orgSlug, jobPostingId) : undefined;
      const previousBoard = boardQueryKey ? queryClient.getQueryData<PipelineBoard>(boardQueryKey) : undefined;
      if (boardQueryKey) {
        await queryClient.cancelQueries({ queryKey: boardQueryKey });
        queryClient.setQueryData<PipelineBoard>(boardQueryKey, (current) => {
          if (!current) return current;
          const completedAt = new Date().toISOString();
          return {
            ...current,
            stages: current.stages.map((stage) => ({
              ...stage,
              applications: stage.applications.map((application) => {
                if (application.id !== params.applicationId || application.interviewMeeting?.id !== params.eventId) {
                  return application;
                }
                return {
                  ...application,
                  interviewMeeting: {
                    ...application.interviewMeeting,
                    status: 'COMPLETED',
                    completedAt,
                    scheduledEndAt: completedAt,
                  },
                };
              }),
            })),
          };
        });
      }
      return { previousBoard, boardQueryKey };
    },
    onError: (_error, _params, context) => {
      if (context?.boardQueryKey && context.previousBoard) {
        queryClient.setQueryData(context.boardQueryKey, context.previousBoard);
      }
    },
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

export function useFetchHiringTeams(orgSlug: string, memberId: string, jobPostingId: string | null, stageId?: string | null) {
  return useQuery({
    queryKey: ['hiring-teams', orgSlug, jobPostingId, stageId],
    queryFn: async () => {
      if (!jobPostingId) throw new Error('Job posting ID is required');
      return fetchHiringTeamsAction({ orgSlug, memberId, jobPostingId, stageId });
    },
    enabled: !!orgSlug && !!memberId && !!jobPostingId,
    retry: false,
  });
}

export function useCreateHiringTeam(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { jobPostingId: string; name: string; description: string | null; members: Array<{ memberId: string; role?: string | null }>; stageId?: string | null }) =>
      createHiringTeamAction({ orgSlug, memberId, jobPostingId: jobPostingId ?? '', data }),
    onSuccess: (_data) => {
      if (jobPostingId) {
        queryClient.invalidateQueries({ queryKey: ['hiring-teams', orgSlug, jobPostingId] });
      }
    },
  });
}

export function useAddHiringTeamMember(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { teamId: string; data: { memberId: string; role?: string | null } }) =>
      addHiringTeamMemberAction({ orgSlug, memberId, ...params }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: ['hiring-teams', orgSlug, jobPostingId] });
    },
  });
}

export function useRemoveHiringTeamMember(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { teamId: string; memberToRemoveId: string }) =>
      removeHiringTeamMemberAction({ orgSlug, memberId, ...params }),
    onSuccess: () => {
      if (jobPostingId) queryClient.invalidateQueries({ queryKey: ['hiring-teams', orgSlug, jobPostingId] });
    },
  });
}

export function useDistributeStageInterviews(orgSlug: string, memberId: string, jobPostingId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<TeamDistributionResponse, Error, { stageSlug: string; data: TeamDistributionRequest }>({
    mutationFn: (args) =>
      distributeStageInterviewsAction({ orgSlug, memberId, ...args }),
    onSuccess: () => {
      if (jobPostingId) {
        queryClient.invalidateQueries({ queryKey: boardKey(orgSlug, jobPostingId) });
      }
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace-job-slug'] });
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug, memberId] });
    },
  });
}

export function useAcceptInterview(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<AcceptInterviewResponse, Error, { eventId: string; data: AcceptInterviewInput }>({
    mutationFn: (args) => acceptInterviewAction({ orgSlug, memberId, ...args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug, memberId] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace-job-slug'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useRejectInterview(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<RejectInterviewResponse, Error, { eventId: string }>({
    mutationFn: (args) => rejectInterviewAction({ orgSlug, memberId, ...args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug, memberId] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace-job-slug'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useMoveInterviewAssignment(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { applicationId: string; eventId: string; data: { newInterviewerMemberId: string } }) =>
      moveInterviewAssignmentAction({ orgSlug, memberId, ...args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug, memberId] });
    },
  });
}

export function useReshuffleInterviewAssignment(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<ReshuffleResponse, Error, { applicationId: string; eventId: string; data: ReshuffleRequest }>({
    mutationFn: (args) =>
      reshuffleInterviewAssignmentAction({ orgSlug, memberId, ...args }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['my-interviews', orgSlug, memberId] });
    },
  });
}

export function useFetchMyInterviews(orgSlug: string, memberId: string) {
  return useQuery<MyInterviewListResponse, Error>({
    queryKey: ['my-interviews', orgSlug, memberId],
    queryFn: () => fetchMyInterviewsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    retry: false,
  });
}

export function useCreateReassignmentRequest(orgSlug: string, memberId: string) {
  return useMutation({
    mutationFn: (args: { eventId: string; data: { reason: string } }) =>
      createReassignmentRequestAction({ orgSlug, memberId, ...args }),
  });
}

// ─── Stage Complete / Reopen ───────────────────────────────────────────────────

export function useCompleteStage(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<PipelineStage, Error, { stageId: string }>({
    mutationFn: (args) =>
      completeStageAction({ orgSlug, memberId, stageId: args.stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
    },
  });
}

export function useReopenStage(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<PipelineStage, Error, { stageId: string }>({
    mutationFn: (args) =>
      reopenStageAction({ orgSlug, memberId, stageId: args.stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
    },
  });
}

// ─── Employee Delete ───────────────────────────────────────────────────────────

export function usePreviewEmployeeDelete(orgSlug: string, memberId: string) {
  return useMutation({
    mutationFn: (memberToDeleteId: string) =>
      previewEmployeeDeleteAction({ orgSlug, memberId, memberToDeleteId }),
  });
}

export function useDeleteEmployee(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberToDeleteId: string) =>
      deleteEmployeeAction({ orgSlug, memberId, memberToDeleteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-stage-workspace'] });
    },
  });
}
