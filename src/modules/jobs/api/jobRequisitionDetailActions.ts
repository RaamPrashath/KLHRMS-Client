'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import type {
  JobRequisitionRecord,
  RequisitionActivityEntry,
} from '@/modules/jobs/types/jobRequisitionTypes';

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
