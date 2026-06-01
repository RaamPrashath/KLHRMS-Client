'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import {
  createJobRequisitionSchema,
  jobRequisitionDecisionSchema,
  updateJobRequisitionSchema,
  type CreateJobRequisitionInput,
  type JobRequisitionDecisionInput,
  type UpdateJobRequisitionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  JobDepartmentOption,
  JobRequisitionRecord,
  OrgMemberOption,
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

export async function fetchJobRequisitionsAction(params: {
  orgSlug: string;
  memberId: string;
  viewScope?: string;
}): Promise<JobRequisitionRecord[]> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const queryParams = params.viewScope ? `?view_scope=${encodeURIComponent(params.viewScope)}` : '';
  const res = await fetch(`${getApiUrl()}/jobs/requisitions${queryParams}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<JobRequisitionRecord[]>(res);
}

export async function fetchJobFormMetaAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<{ departments: JobDepartmentOption[]; members: OrgMemberOption[] }> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/meta`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  const data = await handleResponse<{
    departments: Array<{ id: string; label: string }>;
    members: Array<{ id: string; label: string; email?: string | null }>;
  }>(res);
  return {
    departments: data.departments.map((department) => ({
      id: department.id,
      name: department.label,
    })),
    members: data.members.map((orgMember) => ({
      id: orgMember.id,
      name: orgMember.label,
      email: orgMember.email ?? '',
    })),
  };
}

export async function createJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  data: CreateJobRequisitionInput;
}): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
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
    replacementForId: parsed.data.replacementForId || null,
    businessJustification: parsed.data.businessJustification || null,
    roleSummary: parsed.data.roleSummary || null,
    responsibilities: parsed.data.responsibilities || null,
    requirementsRich: parsed.data.requirementsRich || null,
    benefits: parsed.data.benefits || null,
    aboutTeam: parsed.data.aboutTeam || null,
    education: parsed.data.education || null,
    knockoutRule: parsed.data.knockoutRule?.trim() || null,
  };

  const res = await fetch(`${getApiUrl()}/jobs/requisitions`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify(payload),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function updateJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: UpdateJobRequisitionInput;
}): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = updateJobRequisitionSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({
      status: 400,
      message: parsed.error.issues[0]?.message ?? 'Validation failed',
    }));
  }

  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function submitJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/submit`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

async function decideJobRequisition(
  orgSlug: string,
  requisitionId: string,
  path: 'approve' | 'reject',
  data: JobRequisitionDecisionInput,
): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(orgSlug);
  const parsed = jobRequisitionDecisionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${requisitionId}/${path}`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, member.id),
    body: JSON.stringify({
      ...parsed.data,
      comment: parsed.data.comment || null,
      departmentId: parsed.data.departmentId || null,
      description: parsed.data.description || null,
      requirements: parsed.data.requirements || null,
      location: parsed.data.location || null,
      targetDate: parsed.data.targetDate || null,
      roleSummary: parsed.data.roleSummary || null,
      responsibilities: parsed.data.responsibilities || null,
      requirementsRich: parsed.data.requirementsRich || null,
      benefits: parsed.data.benefits || null,
      aboutTeam: parsed.data.aboutTeam || null,
      hiringReason: parsed.data.hiringReason || null,
      businessJustification: parsed.data.businessJustification || null,
      education: parsed.data.education || null,
      knockoutRule: parsed.data.knockoutRule?.trim() || null,
    }),
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
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/close`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<JobRequisitionRecord>(res);
}

export async function reopenJobRequisitionAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<JobRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/requisitions/${params.requisitionId}/reopen`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<JobRequisitionRecord>(res);
}
