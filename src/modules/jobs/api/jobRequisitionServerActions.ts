'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
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

export async function fetchJobRequisitionsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<JobRequisitionRecord[]> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const permissions = (member.role?.permissions as RolePermissions | null) ?? null;
  const jobsViewScope = getScope(permissions, 'jobs', 'view');

  const res = await fetch(`${getApiUrl()}/jobs/requisitions`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  const requisitions = await handleResponse<JobRequisitionRecord[]>(res);

  if (jobsViewScope === 'organization') {
    return requisitions;
  }
  if (jobsViewScope === 'self') {
    return requisitions.filter((requisition) => requisition.raisedById === member.id);
  }

  throw new Error(JSON.stringify({ status: 403, message: 'you dont have permission' }));
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
