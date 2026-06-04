'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { prisma } from '@/lib/prisma';
import {
  holidaySchema,
  leaveBalanceAssignmentSchema,
  leaveDecisionSchema,
  leaveRequestSchema,
  leaveTypeSchema,
  type LeaveBalanceAssignmentInput,
  type HolidayInput,
  type LeaveDecisionInput,
  type LeaveRequestInput,
  type LeaveTypeInput,
} from '@/modules/leave/schema/leaveSchemas';
import type {
  HolidayListResponse,
  HolidayRecord,
  LeaveBalanceListResponse,
  LeaveBalanceRecord,
  LeaveCalendarResponse,
  LeavePageContext,
  LeaveRequestListResponse,
  LeaveRequestRecord,
  LeaveSummaryListResponse,
  LeaveTypeRecord,
} from '@/modules/leave/types/leaveTypes';

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

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function nullableText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

export async function fetchLeavePageContextAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<LeavePageContext> {
  const membership = await prisma.member.findFirst({
    where: {
      id: params.memberId,
      organization: { slug: params.orgSlug },
    },
    select: {
      organizationId: true,
      role: { select: { permissions: true } },
    },
  });

  if (!membership) {
    throw new Error(JSON.stringify({ status: 404, message: 'Organization membership not found' }));
  }

  const members = await prisma.member.findMany({
    where: { organizationId: membership.organizationId },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    permissions: (membership.role?.permissions as Record<string, Record<string, string>>) ?? {},
    members: members
      .map((member) => ({
        memberId: member.id,
        userId: member.userId,
        name: member.user?.name ?? null,
        email: member.user?.email ?? null,
      }))
      .sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '')),
  };
}

export async function fetchLeaveTypesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<LeaveTypeRecord[]> {
  const res = await fetch(`${getApiUrl()}/leaves/types`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveTypeRecord[]>(res);
}

export async function createLeaveTypeAction(params: {
  orgSlug: string;
  memberId: string;
  data: LeaveTypeInput;
}): Promise<LeaveTypeRecord> {
  const parsed = leaveTypeSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const payload = {
    ...parsed.data,
    color: parsed.data.color || null,
  };
  const res = await fetch(`${getApiUrl()}/leaves/types`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const existing = await fetchLeaveTypesAction({ orgSlug: params.orgSlug, memberId: params.memberId });
    const match = existing.find((item) => item.name.trim().toLowerCase() === parsed.data.name.trim().toLowerCase());
    if (match) return match;
  }
  return handleResponse<LeaveTypeRecord>(res);
}

export async function updateLeaveTypeAction(params: {
  orgSlug: string;
  memberId: string;
  leaveTypeId: string;
  data: LeaveTypeInput;
}): Promise<LeaveTypeRecord> {
  const parsed = leaveTypeSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const payload = {
    ...parsed.data,
    color: parsed.data.color || null,
  };
  const res = await fetch(`${getApiUrl()}/leaves/types/${params.leaveTypeId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  return handleResponse<LeaveTypeRecord>(res);
}

export async function fetchHolidaysAction(params: {
  orgSlug: string;
  memberId: string;
  year?: number;
  month?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<HolidayListResponse> {
  const query = buildQuery({
    year: params.year,
    month: params.month,
    search: params.search,
    page: params.page,
    pageSize: params.pageSize,
  });
  const res = await fetch(`${getApiUrl()}/leaves/holidays${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<HolidayListResponse>(res);
}

export async function createHolidayAction(params: {
  orgSlug: string;
  memberId: string;
  data: HolidayInput;
}): Promise<HolidayRecord> {
  const parsed = holidaySchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const payload = {
    ...parsed.data,
    description: nullableText(parsed.data.description),
  };
  const res = await fetch(`${getApiUrl()}/leaves/holidays`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  return handleResponse<HolidayRecord>(res);
}

export async function updateHolidayAction(params: {
  orgSlug: string;
  memberId: string;
  holidayId: string;
  data: HolidayInput;
}): Promise<HolidayRecord> {
  const parsed = holidaySchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const payload = {
    ...parsed.data,
    description: nullableText(parsed.data.description),
  };
  const res = await fetch(`${getApiUrl()}/leaves/holidays/${params.holidayId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  return handleResponse<HolidayRecord>(res);
}

export async function deleteHolidayAction(params: {
  orgSlug: string;
  memberId: string;
  holidayId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/leaves/holidays/${params.holidayId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function fetchLeaveRequestsAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: {
    status?: string;
    memberId?: string;
    leaveTypeId?: string;
    fromDate?: string;
    toDate?: string;
    year?: number;
    page?: number;
    pageSize?: number;
  };
}): Promise<LeaveRequestListResponse> {
  const query = buildQuery({
    status: params.filters?.status,
    memberId: params.filters?.memberId,
    leaveTypeId: params.filters?.leaveTypeId,
    fromDate: params.filters?.fromDate,
    toDate: params.filters?.toDate,
    year: params.filters?.year,
    page: params.filters?.page,
    page_size: params.filters?.pageSize,
  });
  const res = await fetch(`${getApiUrl()}/leaves/requests${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveRequestListResponse>(res);
}

export async function fetchLeaveRequestAction(params: {
  orgSlug: string;
  memberId: string;
  leaveRequestId: string;
}): Promise<LeaveRequestRecord> {
  const res = await fetch(`${getApiUrl()}/leaves/requests/${params.leaveRequestId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveRequestRecord>(res);
}

export async function createLeaveRequestAction(params: {
  orgSlug: string;
  memberId: string;
  data: LeaveRequestInput;
}): Promise<LeaveRequestRecord> {
  const parsed = leaveRequestSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const payload = {
    ...parsed.data,
    memberId: parsed.data.memberId || null,
    reason: parsed.data.reason || null,
  };
  const res = await fetch(`${getApiUrl()}/leaves/requests`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(payload),
  });
  return handleResponse<LeaveRequestRecord>(res);
}

export async function approveLeaveRequestAction(params: {
  orgSlug: string;
  memberId: string;
  leaveRequestId: string;
  data: LeaveDecisionInput;
}): Promise<LeaveRequestRecord> {
  const parsed = leaveDecisionSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/leaves/requests/${params.leaveRequestId}/approve`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ approverComment: parsed.data.approverComment || null }),
  });
  return handleResponse<LeaveRequestRecord>(res);
}

export async function rejectLeaveRequestAction(params: {
  orgSlug: string;
  memberId: string;
  leaveRequestId: string;
  data: LeaveDecisionInput;
}): Promise<LeaveRequestRecord> {
  const parsed = leaveDecisionSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/leaves/requests/${params.leaveRequestId}/reject`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({ approverComment: parsed.data.approverComment || null }),
  });
  return handleResponse<LeaveRequestRecord>(res);
}

export async function cancelLeaveRequestAction(params: {
  orgSlug: string;
  memberId: string;
  leaveRequestId: string;
}): Promise<LeaveRequestRecord> {
  const res = await fetch(`${getApiUrl()}/leaves/requests/${params.leaveRequestId}/cancel`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<LeaveRequestRecord>(res);
}

export async function fetchLeaveBalancesAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: {
    memberId?: string;
    leaveTypeId?: string;
    year?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  };
}): Promise<LeaveBalanceListResponse> {
  const query = buildQuery({
    memberId: params.filters?.memberId,
    leaveTypeId: params.filters?.leaveTypeId,
    year: params.filters?.year,
    search: params.filters?.search,
    page: params.filters?.page,
    pageSize: params.filters?.pageSize,
  });
  const res = await fetch(`${getApiUrl()}/leaves/balances${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveBalanceListResponse>(res);
}

export async function upsertLeaveBalanceAction(params: {
  orgSlug: string;
  memberId: string;
  data: LeaveBalanceAssignmentInput;
}): Promise<LeaveBalanceRecord> {
  const parsed = leaveBalanceAssignmentSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/leaves/balances`, {
    method: 'PUT',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<LeaveBalanceRecord>(res);
}

export async function fetchLeaveCalendarAction(params: {
  orgSlug: string;
  memberId: string;
  year: number;
  month: number;
}): Promise<LeaveCalendarResponse> {
  const query = buildQuery({ year: params.year, month: params.month });
  const res = await fetch(`${getApiUrl()}/leaves/calendar${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveCalendarResponse>(res);
}

export async function fetchLeaveSummaryAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<LeaveSummaryListResponse> {
  const res = await fetch(`${getApiUrl()}/leaves/summary`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<LeaveSummaryListResponse>(res);
}

export interface HolidaySyncResult {
  year: number;
  organization_id: string;
  rows_inserted: number;
  source: string;
}

export async function syncHolidaysAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<HolidaySyncResult> {
  const res = await fetch(`${getApiUrl()}/leaves/holidays/sync`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<HolidaySyncResult>(res);
}
