'use server';

import { prisma } from '@/lib/prisma';
import type {
  AttendanceRecord,
  AttendanceListResponse,
} from '@/modules/attendance/types/attendanceTypes';
import {
  clockInSchema,
  clockOutSchema,
  manualEntrySchema,
  deleteDayEntrySchema,
  type ClockInInput,
  type ClockOutInput,
  type ManualEntryInput,
  type DeleteDayEntryInput,
  type AttendanceFiltersInput,
} from '@/modules/attendance/schema/attendanceSchemas';

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
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore parse errors — use default message
  }
  // Throw a real Error so Next.js server actions can serialize it to the client.
  // Encode status + message as JSON in the Error.message so the client can parse it.
  throw new Error(JSON.stringify({ status: res.status, message }));
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function fetchMyAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: Omit<AttendanceFiltersInput, 'target_member_id'>;
}): Promise<AttendanceListResponse> {
  const { orgSlug, memberId, filters = {} } = params;
  const query = buildQuery({
    date_from: filters.date_from,
    date_to: filters.date_to,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size,
  });
  const res = await fetch(`${getApiUrl()}/attendance/me${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<AttendanceListResponse>(res);
}

export async function fetchAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: AttendanceFiltersInput;
}): Promise<AttendanceListResponse> {
  const { orgSlug, memberId, filters = {} } = params;
  const query = buildQuery({
    target_member_id: filters.target_member_id,
    employee_name: filters.employee_name,
    date_from: filters.date_from,
    date_to: filters.date_to,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size,
  });
  const res = await fetch(`${getApiUrl()}/attendance${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<AttendanceListResponse>(res);
}

export async function fetchAttendanceDayAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
  day: string; // ISO date
}): Promise<AttendanceRecord> {
  const { orgSlug, memberId, targetMemberId, day } = params;
  const query = buildQuery({ target_member_id: targetMemberId, day });
  const res = await fetch(`${getApiUrl()}/attendance/day${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<AttendanceRecord>(res);
}

export async function clockInAction(params: {
  orgSlug: string;
  memberId: string;
  data: ClockInInput;
}): Promise<AttendanceRecord> {
  const { orgSlug, memberId, data } = params;
  const parsed = clockInSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/attendance/clock-in`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<AttendanceRecord>(res);
}

export async function clockOutAction(params: {
  orgSlug: string;
  memberId: string;
  data: ClockOutInput;
}): Promise<AttendanceRecord[]> {
  const { orgSlug, memberId, data } = params;
  const parsed = clockOutSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/attendance/clock-out`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  // Always returns an array — backend may split midnight sessions
  return handleResponse<AttendanceRecord[]>(res);
}

export async function manualAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  data: ManualEntryInput;
}): Promise<AttendanceRecord> {
  const { orgSlug, memberId, data } = params;
  const parsed = manualEntrySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/attendance/day-entry`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<AttendanceRecord>(res);
}

export async function deleteAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  data: DeleteDayEntryInput;
}): Promise<void> {
  const { orgSlug, memberId, data } = params;
  const parsed = deleteDayEntrySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/attendance/day-entry`, {
    method: 'DELETE',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<void>(res);
}

export async function fetchMemberPermissionsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<Record<string, Record<string, string>>> {
  const member = await prisma.member.findFirst({
    where: { id: params.memberId },
    select: { role: { select: { permissions: true } } },
  });
  if (!member?.role) return {};
  return (member.role.permissions as Record<string, Record<string, string>>) ?? {};
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface AttendanceExportRow {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: string;
  employeeName: string | null;
}

export type AttendanceExportFormat = 'xlsx' | 'pdf' | 'csv';

// Pivot export types
export interface PivotCell {
  date: string;
  totalHours: number | null;
  status: string | null;
}

export interface PivotEmployeeRow {
  employeeName: string;
  cells: PivotCell[];
  total: number;
}

export interface AttendancePivotExportPayload {
  dateColumns: string[];
  rows: PivotEmployeeRow[];
  periodLabel: string;
}

export async function exportAttendanceAction(params: {
  orgSlug: string;
  memberId: string;
  format: AttendanceExportFormat;
  // list mode
  records?: AttendanceExportRow[];
  showEmployeeColumn?: boolean;
  title: string;
  // pivot mode
  exportMode?: 'list' | 'pivot';
  pivotData?: AttendancePivotExportPayload;
}): Promise<Blob> {
  const {
    orgSlug, memberId, format, records, showEmployeeColumn,
    title, exportMode = 'list', pivotData,
  } = params;
  const res = await fetch(`${getApiUrl()}/attendance/export`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify({
      format,
      exportMode,
      records: records ?? [],
      showEmployeeColumn: showEmployeeColumn ?? false,
      title,
      pivotData: pivotData ?? null,
    }),
  });
  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.blob();
}
