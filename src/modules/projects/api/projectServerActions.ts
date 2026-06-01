'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  ProjectDetail,
  ProjectForAttendance,
  ProjectListResponse,
  ProjectMetaResponse,
  ProjectTaskSummary,
} from '@/modules/projects/types/projectTypes';
import type {
  ProjectInput,
  ProjectMemberInput,
  ProjectTaskInput,
} from '@/modules/projects/schema/projectSchemas';

function normalizeOptionalString(value?: string): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProjectPayload(data: ProjectInput): Record<string, unknown> {
  return {
    ...data,
    teamId: normalizeOptionalString(data.teamId),
    clientName: normalizeOptionalString(data.clientName),
    startDate: normalizeOptionalString(data.startDate),
    endDate: normalizeOptionalString(data.endDate),
    description: normalizeOptionalString(data.description),
  };
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

export async function fetchProjectsForAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProjectForAttendance[]> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/for-attendance`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to fetch projects' };
  }

  return res.json();
}

export async function fetchProjectsAction(params: {
  orgSlug: string;
  memberId: string;
  search?: string;
  status?: string;
  billable?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ProjectListResponse> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.status) queryParams.set('status', params.status);
  if (params.billable !== undefined) queryParams.set('billable', String(params.billable));
  if (params.page) queryParams.set('page', String(params.page));
  if (params.pageSize) queryParams.set('page_size', String(params.pageSize));

  const res = await fetch(`${url}/projects?${queryParams.toString()}`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to fetch projects' };
  }

  return res.json();
}

export async function fetchProjectMetaAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProjectMetaResponse> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/meta`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to fetch project metadata' };
  }

  return res.json();
}

export async function fetchProjectByIdAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to fetch project' };
  }

  return res.json();
}

export async function createProjectAction(params: {
  orgSlug: string;
  memberId: string;
  data: ProjectInput;
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeProjectPayload(params.data)),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to create project' };
  }

  return res.json();
}

export async function updateProjectAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectInput;
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeProjectPayload(params.data)),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to update project' };
  }

  return res.json();
}

export async function deleteProjectAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
}): Promise<void> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to delete project' };
  }
}

export async function addProjectMemberAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectMemberInput;
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}/members`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to add project member' };
  }

  return res.json();
}

export async function bulkAssignProjectMembersAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  memberIds: string[];
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}/members/bulk`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ memberIds: params.memberIds }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to bulk assign members' };
  }

  return res.json();
}

export async function removeProjectMemberAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  targetMemberId: string;
}): Promise<ProjectDetail> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}/members/${params.targetMemberId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to remove project member' };
  }

  return res.json();
}

export async function createProjectTaskAction(params: {
  orgSlug: string;
  memberId: string;
  projectId: string;
  data: ProjectTaskInput;
}): Promise<ProjectTaskSummary[]> {
  const url = getHrmsApiUrl();
  if (!url) throw new Error('HRMS_API_URL is not set');

  const res = await fetch(`${url}/projects/${params.projectId}/tasks`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, message: body?.detail ?? 'Failed to create project task' };
  }

  return res.json();
}
