/**
 * Client-side leave fetch functions.
 * These run directly in the browser, bypassing Next.js server actions.
 */

import { getHrmsApiUrl } from "@/lib/deployment-env";
import type {
  HolidayListResponse,
  LeaveRequestListResponse,
} from "@/modules/leave/types/leaveTypes";

export interface LeaveAuth {
  orgSlug: string;
  memberId: string;
}

function buildHeaders(auth: LeaveAuth): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-organization-slug": auth.orgSlug,
    "x-membership-id": auth.memberId,
  };
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  let message = response.statusText;
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    if (body.detail) message = body.detail;
    else if (body.message) message = body.message;
  } catch {
    // Keep the status text when the body is not JSON.
  }

  throw new Error(message);
}

const baseUrl = getHrmsApiUrl();

export async function fetchHolidays(
  auth: LeaveAuth,
  filters?: {
    year?: number;
    month?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<HolidayListResponse> {
  const query = buildQuery({
    year: filters?.year,
    month: filters?.month,
    search: filters?.search,
    page: filters?.page,
    pageSize: filters?.pageSize,
  });
  const response = await fetch(`${baseUrl}/leaves/holidays${query}`, {
    method: "GET",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<HolidayListResponse>;
}

export async function fetchLeaveRequests(
  auth: LeaveAuth,
  filters?: {
    status?: string;
    memberId?: string;
    leaveTypeId?: string;
    fromDate?: string;
    toDate?: string;
    year?: number;
    page?: number;
    pageSize?: number;
  },
): Promise<LeaveRequestListResponse> {
  const query = buildQuery({
    status: filters?.status,
    memberId: filters?.memberId,
    leaveTypeId: filters?.leaveTypeId,
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
    year: filters?.year,
    page: filters?.page,
    page_size: filters?.pageSize,
  });
  const response = await fetch(`${baseUrl}/leaves/requests${query}`, {
    method: "GET",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<LeaveRequestListResponse>;
}
