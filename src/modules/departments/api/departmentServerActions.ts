'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import {
  departmentSchema,
  type DepartmentInput,
} from '@/modules/departments/schema/departmentSchemas';
import type { DepartmentListResponse, DepartmentMetaResponse, DepartmentSummary } from '@/modules/departments/types/departmentTypes';

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

export async function fetchDepartmentByIdAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function addDepartmentMemberAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  targetMemberId: string;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/members`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ headMemberId: params.targetMemberId }),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function bulkAssignDepartmentMembersAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  memberIds: string[];
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/members/bulk`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ memberIds: params.memberIds }),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function removeDepartmentMemberAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  targetMemberId: string;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/members/${params.targetMemberId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function assignDepartmentHeadAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  headMemberId: string;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/heads`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ headMemberId: params.headMemberId }),
  });
  return handleResponse<DepartmentSummary>(res);
}

export async function removeDepartmentHeadAction(params: {
  orgSlug: string;
  memberId: string;
  departmentId: string;
  headMemberId: string;
}): Promise<DepartmentSummary> {
  const res = await fetch(`${getApiUrl()}/departments/${params.departmentId}/heads/${params.headMemberId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<DepartmentSummary>(res);
}

