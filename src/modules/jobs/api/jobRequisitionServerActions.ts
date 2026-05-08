'use server';

import {
  createJobRequisitionSchema,
  jobRequisitionDecisionSchema,
  type CreateJobRequisitionInput,
  type JobRequisitionDecisionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

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
    // ignore parse failures
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

function buildQuery(params: Record<string, string | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchJobRequisitionsAction(params: {
  orgSlug: string;
  memberId: string;
  ownedOnly?: boolean;
}): Promise<JobRequisitionRecord[]> {
  const query = buildQuery({ owned_only: params.ownedOnly ?? false });
  const res = await fetch(`${getApiUrl()}/jobs/requisitions${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<JobRequisitionRecord[]>(res);
}

export async function createJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  data: CreateJobRequisitionInput;
}): Promise<JobRequisitionRecord> {
  const parsed = createJobRequisitionSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const payload = {
    ...parsed.data,
    departmentId: parsed.data.departmentId || null,
    description: parsed.data.description || null,
    requirements: parsed.data.requirements || null,
    location: parsed.data.location || null,
    targetDate: parsed.data.targetDate || null,
  };

  const res = await fetch(`${getApiUrl()}/jobs/requisitions`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function submitJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionRecord> {
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/submit`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

async function decideJobRequisition(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
  path: 'approve' | 'reject',
  data: JobRequisitionDecisionInput,
): Promise<JobRequisitionRecord> {
  const parsed = jobRequisitionDecisionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${requisitionId}/${path}`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify({ comment: parsed.data.comment || null }),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function approveJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: JobRequisitionDecisionInput;
}): Promise<JobRequisitionRecord> {
  return decideJobRequisition(
    params.orgSlug,
    params.memberId,
    params.requisitionId,
    'approve',
    params.data,
  );
}

export async function rejectJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: JobRequisitionDecisionInput;
}): Promise<JobRequisitionRecord> {
  return decideJobRequisition(
    params.orgSlug,
    params.memberId,
    params.requisitionId,
    'reject',
    params.data,
  );
}

export async function closeJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionRecord> {
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/close`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<JobRequisitionRecord>(res);
}
