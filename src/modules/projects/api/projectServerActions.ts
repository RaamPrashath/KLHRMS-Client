'use server';

import {
  projectMemberSchema,
  projectSchema,
  projectTaskSchema,
  type ProjectInput,
  type ProjectMemberInput,
  type ProjectTaskInput,
} from '@/modules/projects/schema/projectSchemas';
import type {
  ProjectDetail,
  ProjectFiltersState,
  ProjectListResponse,
  ProjectMetaResponse,
  ProjectTaskSummary,
} from '@/modules/projects/types/projectTypes';

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
    // ignore
  }
  throw new Error(JSON.stringify({ status: res.status, message }));
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function normalizeProjectPayload(data: ProjectInput) {
  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  return {
    ...parsed.data,
    teamId: parsed.data.teamId || null,
    clientName: parsed.data.clientName || null,
    budget: parsed.data.budget ?? null,
    budgetedHours: parsed.data.budgetedHours ?? null,
    startDate: parsed.data.startDate || null,
    endDate: parsed.data.endDate || null,
    description: parsed.data.description || null,
  };
}

export async function fetchProjectsAction(params: {
  orgSlug: string;
  memberId: string;
  filters: ProjectFiltersState;
}): Promise<ProjectListResponse> {
  const query = buildQuery({
    search: params.filters.search,
    status: params.filters.status,
    billable: params.filters.billable,
    page: params.filters.page,
    page_size: params.filters.pageSize,
  });
  const res = await fetch(`${getApiUrl()}/projects${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<ProjectListResponse>(res);
}

export async function fetchProjectMetaAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProjectMetaResponse> {
  const res = await fetch(`${getApiUrl()}/projects/meta`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<ProjectMetaResponse>(res);
}

export async function fetchProjectDetailAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
}): Promise<ProjectDetail> {
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<ProjectDetail>(res);
}

export async function createProjectAction(params: {
  orgSlug: string;
  memberId: string;
  data: ProjectInput;
}): Promise<ProjectDetail> {
  const res = await fetch(`${getApiUrl()}/projects`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeProjectPayload(params.data)),
  });
  return handleResponse<ProjectDetail>(res);
}

export async function updateProjectAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectInput;
}): Promise<ProjectDetail> {
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeProjectPayload(params.data)),
  });
  return handleResponse<ProjectDetail>(res);
}

export async function deleteProjectAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function addProjectMemberAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectMemberInput;
}): Promise<ProjectDetail> {
  const parsed = projectMemberSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}/members`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      memberId: parsed.data.memberId,
      role: parsed.data.role || null,
      allocatedHours: parsed.data.allocatedHours ?? null,
    }),
  });
  return handleResponse<ProjectDetail>(res);
}

export async function removeProjectMemberAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  targetMemberId: string;
}): Promise<ProjectDetail> {
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}/members/${params.targetMemberId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<ProjectDetail>(res);
}

export async function createProjectTaskAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectTaskInput;
}): Promise<ProjectTaskSummary[]> {
  const parsed = projectTaskSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/projects/${params.projectId}/tasks`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      name: parsed.data.name,
      description: parsed.data.description || null,
      assignedMemberId: parsed.data.assignedMemberId || null,
      status: parsed.data.status,
    }),
  });
  return handleResponse<ProjectTaskSummary[]>(res);
}
