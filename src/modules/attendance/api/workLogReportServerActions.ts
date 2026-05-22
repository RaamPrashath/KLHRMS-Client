'use server';

import type {
  WorkLogReportDetailResponse,
  WorkLogReportFilters,
  WorkLogReportListResponse,
} from '@/modules/attendance/types/workLogReportTypes';

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

function buildQuery(params: Record<string, string | number | undefined | null>): string {
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
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore parse errors
  }
  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchWorkLogReportsAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: WorkLogReportFilters;
}): Promise<WorkLogReportListResponse> {
  const { orgSlug, memberId, filters = {} } = params;
  const query = buildQuery({
    date_from: filters.date_from,
    date_to: filters.date_to,
    department_id: filters.department_id,
    team_id: filters.team_id,
    employee_id: filters.employee_id,
    employee_name: filters.employee_name,
    page: filters.page,
    page_size: filters.page_size,
  });
  const res = await fetch(`${getApiUrl()}/attendance/work-log-reports${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<WorkLogReportListResponse>(res);
}

export async function fetchWorkLogReportDetailAction(params: {
  orgSlug: string;
  memberId: string;
  attendanceRecordId: string;
}): Promise<WorkLogReportDetailResponse> {
  const res = await fetch(`${getApiUrl()}/attendance/work-log-reports/${params.attendanceRecordId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<WorkLogReportDetailResponse>(res);
}

export async function exportWorkLogReportsAction(params: {
  orgSlug: string;
  memberId: string;
  format: 'csv' | 'xlsx';
  filters?: WorkLogReportFilters;
}): Promise<Blob> {
  const { orgSlug, memberId, format, filters = {} } = params;
  const query = buildQuery({
    format,
    date_from: filters.date_from,
    date_to: filters.date_to,
    department_id: filters.department_id,
    team_id: filters.team_id,
    employee_id: filters.employee_id,
    employee_name: filters.employee_name,
  });
  const res = await fetch(`${getApiUrl()}/attendance/work-log-reports/export${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return res.blob();
}
