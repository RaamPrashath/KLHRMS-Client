'use server';

import {
  createPipelineStageSchema,
  moveApplicationStageSchema,
  updatePipelineStageSchema,
  type CreatePipelineStageInput,
  type MoveApplicationStageInput,
  type UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type {
  CandidateApplicationDetail,
  PipelineApplication,
  PipelineBoard,
  PipelineJobPosting,
  PipelineStage,
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
