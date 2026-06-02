'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  ImportableJobPosting,
  PipelineBoardData,
  PipelineStageRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';

function getApiUrl(): string {
  return getHrmsApiUrl();
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

async function getCurrentOrgMember(orgSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error(JSON.stringify({ status: 401, message: 'Unauthorized' }));
  }
  return requireOrgMembership(session.user.id, orgSlug);
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

export async function fetchPipelineBoardAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<PipelineBoardData> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/pipeline`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<PipelineBoardData>(res);
}

export async function createPipelineStageAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: CreatePipelineStageInput;
}): Promise<PipelineStageRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = createPipelineStageSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/pipeline/stages`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<PipelineStageRecord>(res);
}

export async function createDefaultPipelineAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<PipelineBoardData> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/pipeline/default`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<PipelineBoardData>(res);
}

export async function importPipelineAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  sourceJobPostingId: string;
}): Promise<PipelineBoardData> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/pipeline/import`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({ sourceJobPostingId: params.sourceJobPostingId }),
  });
  return handleResponse<PipelineBoardData>(res);
}

export async function fetchImportOptionsAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<ImportableJobPosting[]> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/pipeline/import-options`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ImportableJobPosting[]>(res);
}
