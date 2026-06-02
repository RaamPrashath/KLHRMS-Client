'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  AccessControlAssignmentItem,
  AccessControlAssignmentListResponse,
  AccessControlLogItem,
  AccessControlLogListResponse,
  AccessControlLogSummary,
} from '@/modules/assets/types/accessControlTypes';

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

export async function fetchAccessLogsAction(params: {
  orgSlug: string;
  memberId: string;
  page?: number;
  pageSize?: number;
  employeeMemberId?: string;
  accessPoint?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AccessControlLogListResponse> {
  const query = buildQuery({
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
    employee_member_id: params.employeeMemberId,
    access_point: params.accessPoint,
    status: params.status,
    direction: params.direction,
    date_from: params.dateFrom,
    date_to: params.dateTo,
  });
  const res = await fetch(`${getApiUrl()}/access-control/logs${query}`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<AccessControlLogListResponse>(res);
}

export async function fetchAccessLogSummaryAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AccessControlLogSummary> {
  const res = await fetch(`${getApiUrl()}/access-control/logs/summary`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<AccessControlLogSummary>(res);
}

export async function createAccessLogAction(params: {
  orgSlug: string;
  memberId: string;
  data: {
    employeeMemberId: string;
    assetId?: string | null;
    accessPoint: string;
    entryMethod: string;
    status: string;
    direction: string;
    enteredAt: string;
    isActive?: boolean;
    notes?: string | null;
  };
}): Promise<{ id: string; message: string }> {
  const res = await fetch(`${getApiUrl()}/access-control/logs`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<{ id: string; message: string }>(res);
}

export async function updateAccessLogAction(params: {
  orgSlug: string;
  memberId: string;
  logId: string;
  data: { isActive?: boolean; notes?: string | null };
}): Promise<{ id: string; message: string }> {
  const res = await fetch(`${getApiUrl()}/access-control/logs/${params.logId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<{ id: string; message: string }>(res);
}

export async function bulkImportAccessLogsAction(params: {
  orgSlug: string;
  memberId: string;
  logs: Array<{
    employeeMemberId: string;
    assetId?: string | null;
    accessPoint: string;
    entryMethod: string;
    status: string;
    direction: string;
    enteredAt: string;
    isActive?: boolean;
    notes?: string | null;
  }>;
}): Promise<{ imported: number; message: string }> {
  const res = await fetch(`${getApiUrl()}/access-control/logs/import`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.logs),
  });
  return handleResponse<{ imported: number; message: string }>(res);
}

export async function fetchAccessAssignmentsAction(params: {
  orgSlug: string;
  memberId: string;
  page?: number;
  pageSize?: number;
  employeeMemberId?: string;
  accessPoint?: string;
  status?: string;
}): Promise<AccessControlAssignmentListResponse> {
  const query = buildQuery({
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
    employee_member_id: params.employeeMemberId,
    access_point: params.accessPoint,
    status: params.status,
  });
  const res = await fetch(`${getApiUrl()}/access-control/assignments${query}`, {
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<AccessControlAssignmentListResponse>(res);
}

export async function createAccessAssignmentAction(params: {
  orgSlug: string;
  memberId: string;
  data: { employeeMemberId: string; accessPoint: string; status?: string };
}): Promise<{ id: string; message: string }> {
  const res = await fetch(`${getApiUrl()}/access-control/assignments`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<{ id: string; message: string }>(res);
}

export async function updateAccessAssignmentAction(params: {
  orgSlug: string;
  memberId: string;
  assignmentId: string;
  data: { status?: string; revokedAt?: string | null };
}): Promise<{ id: string; status: string; message: string }> {
  const res = await fetch(`${getApiUrl()}/access-control/assignments/${params.assignmentId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<{ id: string; status: string; message: string }>(res);
}
