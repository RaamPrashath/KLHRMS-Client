'use server';

import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import type { PlanLocationValue } from '@/types/weekly_plan';
import type {
  ApiError,
  AttendanceClockContext,
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

function buildAuthorizedHeaders(
  orgSlug: string,
  memberId: string,
  token: string,
): HeadersInit {
  return {
    ...buildHeaders(orgSlug, memberId),
    Authorization: `Bearer ${token}`,
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

export type AttendanceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

async function handleActionResponse<T>(res: Response): Promise<AttendanceActionResult<T>> {
  try {
    const data = await handleResponse<T>(res);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: parseApiError(error) };
  }
}

function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as Partial<ApiError>;
      if (typeof parsed.message === 'string') {
        return {
          status: typeof parsed.status === 'number' ? parsed.status : 500,
          message: parsed.message,
        };
      }
    } catch {
      return { status: 500, message: error.message };
    }
  }
  return { status: 500, message: 'Request failed' };
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

function getIsoWeekParts(dateIso: string): { year: number; week: number } {
  const [year, month, day] = dateIso.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: isoYear, week };
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
}): Promise<AttendanceActionResult<AttendanceRecord>> {
  const { orgSlug, memberId, data } = params;
  const parsed = clockInSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      },
    };
  }
  const res = await fetch(`${getApiUrl()}/attendance/clock-in`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleActionResponse<AttendanceRecord>(res);
}

export async function clockOutAction(params: {
  orgSlug: string;
  memberId: string;
  data: ClockOutInput;
}): Promise<AttendanceActionResult<AttendanceRecord[]>> {
  const { orgSlug, memberId, data } = params;
  const parsed = clockOutSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      },
    };
  }
  const res = await fetch(`${getApiUrl()}/attendance/clock-out`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  // Always returns an array — backend may split midnight sessions
  return handleActionResponse<AttendanceRecord[]>(res);
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

export async function fetchMemberProfileAction(params: {
  memberId: string;
}): Promise<{ name: string | null }> {
  const member = await prisma.member.findUnique({
    where: { id: params.memberId },
    select: { user: { select: { name: true } } },
  });
  return { name: member?.user?.name ?? null };
}

export async function fetchAttendanceClockContextAction(params: {
  orgSlug: string;
  memberId: string;
  date: string;
}): Promise<AttendanceClockContext> {
  const organization = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { latitude: true, longitude: true },
  });

  const office =
    organization?.latitude != null && organization.longitude != null
      ? {
          latitude: organization.latitude,
          longitude: organization.longitude,
          radiusMeters: Number(
            process.env.ATTENDANCE_OFFICE_RADIUS_METERS ??
              process.env.NEXT_PUBLIC_ATTENDANCE_OFFICE_RADIUS_METERS ??
              '200',
          ),
        }
      : null;

  const { year, week } = getIsoWeekParts(params.date);
  let plannedLocation: PlanLocationValue | null = null;

  try {
    const session = await getServerSession();
    const token = session?.session?.token;
    if (!token) {
      return { plannedLocation, office };
    }

    const query = buildQuery({ year, week });
    const res = await fetch(`${getApiUrl()}/weekly-plans${query}`, {
      method: 'GET',
      headers: buildAuthorizedHeaders(params.orgSlug, params.memberId, token),
      cache: 'no-store',
    });
    const entries = await handleResponse<
      Array<{ date: string; work_location: PlanLocationValue }>
    >(res);
    plannedLocation =
      entries.find((entry) => entry.date === params.date)?.work_location ?? null;
  } catch {
    plannedLocation = null;
  }

  return {
    plannedLocation,
    office,
  };
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
