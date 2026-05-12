'use server';

import {
  createPipelineStageSchema,
  createInterviewMeetingSchema,
  extendPipelineStageSchema,
  moveApplicationStageSchema,
  stageInterviewAssignmentRequestSchema,
  stageInterviewWarningRequestSchema,
  updatePipelineStageSchema,
  type CreatePipelineStageInput,
  type CreateInterviewMeetingInput,
  type ExtendPipelineStageInput,
  type MoveApplicationStageInput,
  type StageInterviewAssignmentInput,
  type UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type {
  CandidateApplicationDetail,
  HiringTeam,
  InterviewMeeting,
  MyInterviewListResponse,
  PipelineApplication,
  PipelineBoard,
  PipelineJobPosting,
  PipelineStage,
  ReshuffleRequest,
  ReshuffleResponse,
  TeamDistributionRequest,
  TeamDistributionResponse,
  InterviewerSearchResponse,
  StageInterviewAssignmentResponse,
  StageInterviewWarningResponse,
  StageEvaluationWorkspace,
  StageWorkspace,
} from '@/modules/candidates/types/atsTypes';

function getApiUrl(): string {
  const url = process.env.HRMS_API_URL;
  if (!url) throw new Error('HRMS_API_URL environment variable is not set');
  return url;
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // Keep the status-based message.
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchPipelineJobPostingsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<PipelineJobPosting[]> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/postings`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<PipelineJobPosting[]>(res);
}

export async function fetchPipelineBoardAction(params: {
  orgSlug: string;
  memberId: string;
  jobPostingId: string;
}): Promise<PipelineBoard> {
  const query = new URLSearchParams({ jobPostingId: params.jobPostingId });
  const res = await fetch(`${getApiUrl()}/candidates/pipeline?${query.toString()}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<PipelineBoard>(res);
}

export async function fetchStageWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  stageSlug: string;
}): Promise<StageWorkspace> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/by-slug/${encodeURIComponent(params.stageSlug)}/workspace`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<StageWorkspace>(res);
}

export async function searchInterviewersAction(params: {
  orgSlug: string;
  memberId: string;
  search?: string;
}): Promise<InterviewerSearchResponse> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/interviewers${suffix}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<InterviewerSearchResponse>(res);
}

export async function previewStageInterviewWarningsAction(params: {
  orgSlug: string;
  memberId: string;
  stageSlug: string;
  assignments: StageInterviewAssignmentInput[];
}): Promise<StageInterviewWarningResponse> {
  const parsed = stageInterviewWarningRequestSchema.safeParse({ assignments: params.assignments });
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/by-slug/${encodeURIComponent(params.stageSlug)}/assignments/warnings`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<StageInterviewWarningResponse>(res);
}

export async function assignStageInterviewsAction(params: {
  orgSlug: string;
  memberId: string;
  stageSlug: string;
  assignments: StageInterviewAssignmentInput[];
}): Promise<StageInterviewAssignmentResponse> {
  const parsed = stageInterviewAssignmentRequestSchema.safeParse({ assignments: params.assignments });
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/by-slug/${encodeURIComponent(params.stageSlug)}/assignments`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<StageInterviewAssignmentResponse>(res);
}

export async function moveApplicationStageAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
  data: MoveApplicationStageInput;
}): Promise<PipelineApplication> {
  const parsed = moveApplicationStageSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/applications/${params.applicationId}/stage`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<PipelineApplication>(res);
}

export async function fetchCandidateApplicationDetailAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
}): Promise<CandidateApplicationDetail> {
  const res = await fetch(`${getApiUrl()}/candidates/applications/${params.applicationId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<CandidateApplicationDetail>(res);
}

export async function createInterviewMeetingAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
  data: CreateInterviewMeetingInput;
}): Promise<InterviewMeeting> {
  const parsed = createInterviewMeetingSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/applications/${params.applicationId}/interview-meetings`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<InterviewMeeting>(res);
}

export async function completeInterviewMeetingAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
  eventId: string;
}): Promise<InterviewMeeting> {
  const res = await fetch(`${getApiUrl()}/candidates/applications/${params.applicationId}/interview-meetings/${params.eventId}/complete`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<InterviewMeeting>(res);
}

export async function createPipelineStageAction(params: {
  orgSlug: string;
  memberId: string;
  data: CreatePipelineStageInput;
}): Promise<PipelineStage> {
  const parsed = createPipelineStageSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<PipelineStage>(res);
}

export async function updatePipelineStageAction(params: {
  orgSlug: string;
  memberId: string;
  stageId: string;
  data: UpdatePipelineStageInput;
}): Promise<PipelineStage> {
  const parsed = updatePipelineStageSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/${params.stageId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<PipelineStage>(res);
}

export async function extendPipelineStageAction(params: {
  orgSlug: string;
  memberId: string;
  data: ExtendPipelineStageInput;
}): Promise<PipelineStage> {
  const parsed = extendPipelineStageSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/${parsed.data.stageId}/extend`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<PipelineStage>(res);
}

export async function fetchEvaluationWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  stageId: string;
}): Promise<StageEvaluationWorkspace> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/${params.stageId}/evaluation-workspace`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<StageEvaluationWorkspace>(res);
}

export async function generateEvaluationWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  stageId: string;
}): Promise<StageEvaluationWorkspace> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/${params.stageId}/evaluation-workspace`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<StageEvaluationWorkspace>(res);
}

export async function deletePipelineStageAction(params: {
  orgSlug: string;
  memberId: string;
  stageId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/${params.stageId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function fetchHiringTeamsAction(params: {
  orgSlug: string;
  memberId: string;
  jobPostingId: string;
}): Promise<{ items: HiringTeam[]; total: number }> {
  const res = await fetch(`${getApiUrl()}/hiring-teams?jobPostingId=${encodeURIComponent(params.jobPostingId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<{ items: HiringTeam[]; total: number }>(res);
}

export async function createHiringTeamAction(params: {
  orgSlug: string;
  memberId: string;
  jobPostingId: string;
  data: {
    jobPostingId: string;
    name: string;
    description: string | null;
    members: Array<{ memberId: string; role?: string | null }>;
  };
}): Promise<HiringTeam> {
  const res = await fetch(`${getApiUrl()}/hiring-teams`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      ...params.data,
      jobPostingId: params.data.jobPostingId || params.jobPostingId,
    }),
  });
  return handleResponse<HiringTeam>(res);
}

export async function distributeStageInterviewsAction(params: {
  orgSlug: string;
  memberId: string;
  stageSlug: string;
  data: TeamDistributionRequest;
}): Promise<TeamDistributionResponse> {
  const res = await fetch(`${getApiUrl()}/candidates/pipeline/stages/by-slug/${params.stageSlug}/team-assignments`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<TeamDistributionResponse>(res);
}

export async function reshuffleInterviewAssignmentAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
  eventId: string;
  data: ReshuffleRequest;
}): Promise<ReshuffleResponse> {
  const res = await fetch(
    `${getApiUrl()}/candidates/applications/${params.applicationId}/interview-events/${params.eventId}/reshuffle`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(params.data),
    }
  );
  return handleResponse<ReshuffleResponse>(res);
}

export async function fetchMyInterviewsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<MyInterviewListResponse> {
  const res = await fetch(`${getApiUrl()}/candidates/interviews/my`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<MyInterviewListResponse>(res);
}

export async function createReassignmentRequestAction(params: {
  orgSlug: string;
  memberId: string;
  eventId: string;
  data: { reason: string };
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/candidates/interviews/${params.eventId}/reassignment-requests`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<void>(res);
}
