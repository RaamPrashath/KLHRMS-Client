'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  AttendanceReportExportPayload,
  AttendanceReportFilters,
  AttendanceReportListResponse,
  AttendanceReportOptionsResponse,
} from '@/modules/attendance-report/types';

function getApiUrl(): string {
  return getHrmsApiUrl().replace(/\/$/, '');
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

function buildQuery(filters: AttendanceReportFilters): string {
  const query = new URLSearchParams();
  query.set('date_from', filters.date_from);
  query.set('date_to', filters.date_to);
  if (filters.project_id) query.set('project_id', filters.project_id);
  if (filters.department_id) query.set('department_id', filters.department_id);
  for (const employeeId of filters.employee_ids ?? []) {
    query.append('employee_id', employeeId);
  }
  if (filters.page) query.set('page', String(filters.page));
  if (filters.page_size) query.set('page_size', String(filters.page_size));
  return `?${query.toString()}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
  } catch {
    // keep default message
  }
  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchAttendanceReportOptionsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AttendanceReportOptionsResponse> {
  const res = await fetch(`${getApiUrl()}/attendance-report/options`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AttendanceReportOptionsResponse>(res);
}

export async function fetchAttendanceReportAction(params: {
  orgSlug: string;
  memberId: string;
  filters: AttendanceReportFilters;
}): Promise<AttendanceReportListResponse> {
  const res = await fetch(`${getApiUrl()}/attendance-report${buildQuery(params.filters)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AttendanceReportListResponse>(res);
}

export async function exportAttendanceReportAction(params: {
  orgSlug: string;
  memberId: string;
  payload: AttendanceReportExportPayload;
}): Promise<Blob> {
  const res = await fetch(`${getApiUrl()}/attendance-report/export`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.payload),
  });

  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return res.blob();
}
