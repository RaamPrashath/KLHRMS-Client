/**
 * leave — Layer 1 fetch functions.
 *
 * Plain async functions — no React, no hooks.
 * Import baseUrl from api-client. Never read process.env here.
 * Always pass credentials: "include".
 * Always throw on non-ok responses.
 */

import { baseUrl } from "@/lib/api-client";

// ── Domain types ──────────────────────────────────────────────────────────────

export interface LeaveTypeConfig {
  id: string;
  organization_id: string;
  name: string;
  quota: number;
  carry_forward: boolean;
  is_paid: boolean;
  color: string;
  is_active: boolean;
  description: string | null;
  created_at: string | null;
}

export interface LeaveRequest {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string | null;
  employee_email: string | null;
  leave_type_id: string;
  leave_type_name: string | null;
  leave_type_color: string | null;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by_id: string | null;
  approver_name: string | null;
  approver_comment: string | null;
  created_at: string | null;
}

// Values must match the backend StrEnum exactly (lowercase)
export const LeaveStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved:  "bg-green-100 text-green-800 border-green-200",
  rejected:  "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

export interface LeaveBalance {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string | null;
  leave_type_id: string;
  leave_type_name: string | null;
  leave_type_color: string | null;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
  carried_forward: number;
  lapsed: number;
}

export interface Holiday {
  id: string;
  organization_id: string;
  name: string;
  holiday_date: string;
  is_recurring: boolean;
  description: string | null;
}

export interface CalendarEvent {
  id: string;
  employee_id: string;
  employee_name: string | null;
  leave_type_id: string;
  leave_type_name: string | null;
  leave_type_color: string | null;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveStatus;
}

export interface LeaveSummary {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_days_taken: number;
  by_type: Record<string, number>;
}

export interface OrgMember {
  user_id: string;
  name: string | null;
  email: string;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface LeaveTypeCreateInput {
  name: string;
  quota: number;
  carry_forward?: boolean;
  is_paid?: boolean;
  color?: string;
  description?: string | null;
}

export interface LeaveTypeUpdateInput {
  name?: string;
  quota?: number;
  carry_forward?: boolean;
  is_paid?: boolean;
  color?: string;
  is_active?: boolean;
  description?: string | null;
}

export interface LeaveRequestCreateInput {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface ApproveInput {
  comment?: string | null;
}

export interface RejectInput {
  comment: string; // required — employee must be told why
}

export interface BalanceAllocateInput {
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
}

export interface AutoAllocateInput {
  year: number;
}

export interface HolidayCreateInput {
  name: string;
  holiday_date: string;
  is_recurring?: boolean;
  description?: string | null;
}

export interface HolidayUpdateInput {
  name?: string;
  holiday_date?: string;
  is_recurring?: boolean;
  description?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(token: string, orgId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "x-organization-id": orgId,
    Accept: "application/json",
  };
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // body was not JSON
    }
    throw new Error(message);
  }
}

// ── Leave Types ───────────────────────────────────────────────────────────────

export async function fetchLeaveTypes(
  token: string,
  orgId: string,
): Promise<LeaveTypeConfig[]> {
  const res = await fetch(`${baseUrl}/leaves/types`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveTypeConfig[]>;
}

export async function fetchAllLeaveTypes(
  token: string,
  orgId: string,
): Promise<LeaveTypeConfig[]> {
  const res = await fetch(`${baseUrl}/leaves/types/all`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveTypeConfig[]>;
}

export async function createLeaveType(
  token: string,
  orgId: string,
  body: LeaveTypeCreateInput,
): Promise<LeaveTypeConfig> {
  const res = await fetch(`${baseUrl}/leaves/types`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveTypeConfig>;
}

export async function updateLeaveType(
  token: string,
  orgId: string,
  typeId: string,
  body: LeaveTypeUpdateInput,
): Promise<LeaveTypeConfig> {
  const res = await fetch(`${baseUrl}/leaves/types/${typeId}`, {
    method: "PUT",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveTypeConfig>;
}

export async function deleteLeaveType(
  token: string,
  orgId: string,
  typeId: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/leaves/types/${typeId}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
}

// ── Leave Requests ─────────────────────────────────────────────────────────────

export async function fetchLeaveRequests(
  token: string,
  orgId: string,
  status?: LeaveStatus,
  offset = 0,
  limit = 20,
): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("offset", String(offset));
  params.append("limit", String(limit));
  const res = await fetch(`${baseUrl}/leaves/requests?${params}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveRequest[]>;
}

export async function submitLeaveRequest(
  token: string,
  orgId: string,
  body: LeaveRequestCreateInput,
): Promise<LeaveRequest> {
  const res = await fetch(`${baseUrl}/leaves/requests`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveRequest>;
}

export async function cancelLeaveRequest(
  token: string,
  orgId: string,
  requestId: string,
): Promise<LeaveRequest> {
  const res = await fetch(`${baseUrl}/leaves/requests/${requestId}/cancel`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveRequest>;
}

export async function approveLeaveRequest(
  token: string,
  orgId: string,
  requestId: string,
  body?: ApproveInput,
): Promise<LeaveRequest> {
  const safeBody = body ?? {};
  const res = await fetch(`${baseUrl}/leaves/requests/${requestId}/approve`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(safeBody),   // always a string: at minimum "{}"
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveRequest>;
}

export async function rejectLeaveRequest(
  token: string,
  orgId: string,
  requestId: string,
  body: RejectInput,
): Promise<LeaveRequest> {
  const res = await fetch(`${baseUrl}/leaves/requests/${requestId}/reject`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveRequest>;
}

// ── Leave Balances ───────────────────────────────────────────────────────────

export async function fetchLeaveBalances(
  token: string,
  orgId: string,
  employeeId?: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const params = new URLSearchParams();
  if (employeeId) params.append("employee_id", employeeId);
  if (year) params.append("year", String(year));
  const res = await fetch(`${baseUrl}/leaves/balances?${params}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveBalance[]>;
}

export async function allocateBalance(
  token: string,
  orgId: string,
  body: BalanceAllocateInput,
): Promise<LeaveBalance> {
  const res = await fetch(`${baseUrl}/leaves/balances/allocate`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<LeaveBalance>;
}

export async function autoAllocateBalances(
  token: string,
  orgId: string,
  body: AutoAllocateInput,
): Promise<{ message: string; count: number }> {
  const res = await fetch(`${baseUrl}/leaves/balances/auto-allocate`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<{ message: string; count: number }>;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export async function fetchCalendarEvents(
  token: string,
  orgId: string,
  dateFrom: string,
  dateTo: string,
  employeeId?: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
  });
  if (employeeId) params.append("employee_id", employeeId);
  const res = await fetch(`${baseUrl}/leaves/calendar?${params}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<CalendarEvent[]>;
}

// ── Holidays ───────────────────────────────────────────────────────────────────

export async function fetchHolidays(
  token: string,
  orgId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<Holiday[]> {
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  const res = await fetch(`${baseUrl}/leaves/holidays?${params}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<Holiday[]>;
}

export async function createHoliday(
  token: string,
  orgId: string,
  body: HolidayCreateInput,
): Promise<Holiday> {
  const res = await fetch(`${baseUrl}/leaves/holidays`, {
    method: "POST",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<Holiday>;
}

export async function updateHoliday(
  token: string,
  orgId: string,
  holidayId: string,
  body: HolidayUpdateInput,
): Promise<Holiday> {
  const res = await fetch(`${baseUrl}/leaves/holidays/${holidayId}`, {
    method: "PUT",
    credentials: "include",
    headers: { ...authHeaders(token, orgId), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<Holiday>;
}

export async function deleteHoliday(
  token: string,
  orgId: string,
  holidayId: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/leaves/holidays/${holidayId}`, {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
}

// ── Org Members ───────────────────────────────────────────────────────────────

export async function fetchOrgMembers(
  token: string,
  orgId: string,
): Promise<OrgMember[]> {
  const res = await fetch(`${baseUrl}/leaves/members`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<OrgMember[]>;
}
