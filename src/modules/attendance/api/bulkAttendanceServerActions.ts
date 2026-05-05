'use server';

import type {
  GetBulkAttendanceRangeResponse,
  GetBulkAttendanceDayResponse,
  UpsertBulkAttendanceRequest,
  UpsertBulkAttendanceResponse,
  DeleteBulkAttendanceDayResponse,
} from '@/modules/attendance/types/bulkAttendanceTypes';
import type { ApiError } from '@/modules/attendance/types/attendanceTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    else if (Array.isArray(body?.detail)) {
      message = body.detail
        .map((item: { msg?: string; loc?: unknown[] }) => {
          const path = Array.isArray(item.loc) ? item.loc.join('.') : null;
          return path ? `${path}: ${item.msg ?? 'Invalid value'}` : item.msg ?? 'Invalid value';
        })
        .join('; ');
    }
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore parse errors
  }
  const error: ApiError = { status: res.status, message };
  throw error;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * GET /attendance/bulk-work-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Fetch all saved bulk attendance days and child work logs for a date range.
 */
export async function fetchBulkAttendanceRangeAction(params: {
  orgSlug: string;
  memberId: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}): Promise<GetBulkAttendanceRangeResponse> {
  const { orgSlug, memberId, from, to } = params;
  const url = `${getApiUrl()}/attendance/bulk-work-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<GetBulkAttendanceRangeResponse>(res);
}

/**
 * GET /attendance/bulk-work-logs/day?day=YYYY-MM-DD
 * Fetch one specific day with attendance summary and all child work logs.
 */
export async function fetchBulkAttendanceDayAction(params: {
  orgSlug: string;
  memberId: string;
  day: string; // YYYY-MM-DD
}): Promise<GetBulkAttendanceDayResponse> {
  const { orgSlug, memberId, day } = params;
  const url = `${getApiUrl()}/attendance/bulk-work-logs/day?day=${encodeURIComponent(day)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<GetBulkAttendanceDayResponse>(res);
}

/**
 * POST /attendance/bulk-work-logs
 * Create or replace one or more days of work logs.
 */
export async function upsertBulkAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  data: UpsertBulkAttendanceRequest;
}): Promise<UpsertBulkAttendanceResponse> {
  const { orgSlug, memberId, data } = params;
  const res = await fetch(`${getApiUrl()}/attendance/bulk-work-logs`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(data),
  });
  return handleResponse<UpsertBulkAttendanceResponse>(res);
}

/**
 * DELETE /attendance/bulk-work-logs/day?day=YYYY-MM-DD
 * Delete one day's bulk attendance entry.
 */
export async function deleteBulkAttendanceDayAction(params: {
  orgSlug: string;
  memberId: string;
  day: string; // YYYY-MM-DD
}): Promise<DeleteBulkAttendanceDayResponse> {
  const { orgSlug, memberId, day } = params;
  const url = `${getApiUrl()}/attendance/bulk-work-logs/day?day=${encodeURIComponent(day)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(orgSlug, memberId),
  });
  return handleResponse<DeleteBulkAttendanceDayResponse>(res);
}
