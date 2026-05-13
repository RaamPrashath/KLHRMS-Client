'use server';

import {
  departmentSchema,
  teamMemberSchema,
  teamSchema,
  type DepartmentInput,
  type TeamInput,
  type TeamMemberInput,
} from '@/modules/departments/schema/departmentSchemas';
import type { DepartmentListResponse, DepartmentMetaResponse, DepartmentSummary, TeamSummary } from '@/modules/departments/types/departmentTypes';

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

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
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
  } catch {
    // ignore
  }
  throw new Error(JSON.stringify({ status: res.status, message }));
}

function normalizeDepartment(data: DepartmentInput) {
  const parsed = departmentSchema.safeParse(data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  return {
    ...parsed.data,
    headMemberId: parsed.data.headMemberId || null,
    parentDepartmentId: parsed.data.parentDepartmentId || null,
  };
}

function normalizeTeam(data: TeamInput) {
  const parsed = teamSchema.safeParse(data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  return {
    ...parsed.data,
    description: parsed.data.description || null,
    leadMemberId: parsed.data.leadMemberId || null,
  };
}

export async function fetchDepartmentsAction(params: {
  orgSlug: string;
  memberId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<DepartmentListResponse> {
  const query = buildQuery({
    search: params.search || undefined,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 25,
  });
  const res = await fetch(`${getApiUrl()}/departments${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DepartmentListResponse>(res);
}

export async function fetchDepartmentMetaAction(params: { orgSlug: string; memberId: string }): Promise<DepartmentMetaResponse> {
  const res = await fetch(`${getApiUrl()}/departments/meta`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DepartmentMetaResponse>(res);
}

export async function createDepartmentAction(params: {
  orgSlug: string;
  memberId: string;
  data: DepartmentInput;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeDepartment(params.data)),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function updateDepartmentAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  data: DepartmentInput;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeDepartment(params.data)),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function deleteDepartmentAction(params: { orgSlug: string; memberId: string; departmentId: string }): Promise<void> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function createTeamAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  data: TeamInput;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/teams`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeTeam(params.data)),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function assignTeamMemberAction(params: {
  orgSlug: string;
  memberId: string;
  teamId: string;
  data: TeamMemberInput;
}): Promise<TeamSummary> {
  const parsed = teamMemberSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(`${getApiUrl()}/departments/teams/${params.teamId}/members`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ memberId: parsed.data.memberId, role: parsed.data.role || null }),
  });
  return handleResponse<TeamSummary>(res);
}

export async function removeTeamMemberAction(params: {
  orgSlug: string;
  memberId: string;
  teamId: string;
  targetMemberId: string;
}): Promise<TeamSummary> {
  const res = await fetch(`${getApiUrl()}/departments/teams/${params.teamId}/members/${params.targetMemberId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<TeamSummary>(res);
}
