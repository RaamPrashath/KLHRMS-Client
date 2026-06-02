'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import type {
  JobRequisitionAiAnalysis,
  JobRequisitionRecord,
  RequisitionActivityEntry,
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
    // ignore parse failures
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchJobRequisitionDetailAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function fetchRequisitionActivityAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<RequisitionActivityEntry[]> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/activity`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<RequisitionActivityEntry[]>(res);
}

export async function fetchRequisitionAiAnalysisAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionAiAnalysis> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/ai-analysis`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<JobRequisitionAiAnalysis>(res);
}

export async function rebuildRequisitionAiAnalysisAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionAiAnalysis> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/ai-analysis/rebuild`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<JobRequisitionAiAnalysis>(res);
}

export async function reEvaluateRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionAiAnalysis> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/re-evaluate`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<JobRequisitionAiAnalysis>(res);
}
