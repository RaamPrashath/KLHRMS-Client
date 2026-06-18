/**
 * Client-side attendance fetch functions.
 * These run directly in the browser, bypassing Next.js server actions.
 */

import { getHrmsApiUrl } from "@/lib/deployment-env";
import type {
  AttendanceListResponse,
} from "@/modules/attendance/types/attendanceTypes";

export interface AttendanceAuth {
  orgSlug: string;
  memberId: string;
}

function buildHeaders(auth: AttendanceAuth): Record<string, string> {
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

export async function fetchMyAttendance(
  auth: AttendanceAuth,
  filters?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    page?: number;
    page_size?: number;
  },
): Promise<AttendanceListResponse> {
  const query = buildQuery({
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    status: filters?.status,
    page: filters?.page,
    page_size: filters?.page_size,
  });
  console.info("[attendance-pagination] http-request", {
    endpoint: "/attendance/me",
    apiRequestPage: filters?.page,
    apiRequestPageSize: filters?.page_size,
  });
  const response = await fetch(`${baseUrl}/attendance/me${query}`, {
    method: "GET",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  const data = await response.json() as AttendanceListResponse;
  return data;
}

export async function fetchAttendance(
  auth: AttendanceAuth,
  filters?: {
    target_member_id?: string;
    employee_name?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    page?: number;
    page_size?: number;
  },
): Promise<AttendanceListResponse> {
  const query = buildQuery({
    target_member_id: filters?.target_member_id,
    employee_name: filters?.employee_name,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    status: filters?.status,
    page: filters?.page,
    page_size: filters?.page_size,
  });
  console.info("[attendance-pagination] http-request", {
    endpoint: "/attendance",
    apiRequestPage: filters?.page,
    apiRequestPageSize: filters?.page_size,
  });
  const _t0 = performance.now();
  const response = await fetch(`${baseUrl}/attendance${query}`, {
    method: "GET",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  const data = await response.json() as AttendanceListResponse;
  const _t1 = performance.now();
  console.warn(
    `[timing] 1-attendance-query | date_from=${filters?.date_from} date_to=${filters?.date_to} page=${filters?.page} page_size=${filters?.page_size} | ` +
    `duration=${(_t1 - _t0).toFixed(1)}ms | total=${data.total} items=${data.items.length}`,
  );
  return data;
}
