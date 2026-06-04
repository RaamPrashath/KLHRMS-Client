'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  EmployeeListResponse,
  EmployeeFilterOption,
} from '@/modules/employees/types/employeeTypes';
import type { EmployeeFiltersInput } from '@/modules/employees/schema/employeeSchemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    // ignore parse errors
  }
  throw new Error(JSON.stringify({ status: res.status, message }));
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

function toAbsoluteApiUrl(url: string | null): string | null {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${getApiUrl().replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function fetchEmployeesAction(params: {
  orgSlug: string;
  memberId: string;
  filters?: Partial<EmployeeFiltersInput>;
}): Promise<EmployeeListResponse> {
  const { orgSlug, memberId, filters = {} } = params;

  const query = buildQuery({
    search: filters.search || undefined,
    role_id: filters.roleId,
    attendance_status: filters.attendanceStatus,
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 25,
  });

  const res = await fetch(`${getApiUrl()}/employees${query}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });

  const data = await handleResponse<EmployeeListResponse>(res);
  return {
    ...data,
    items: data.items.map((employee) => ({
      ...employee,
      image: toAbsoluteApiUrl(employee.image),
    })),
  };
}

export async function fetchEmployeeRolesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<EmployeeFilterOption[]> {
  const res = await fetch(`${getApiUrl()}/employees/roles`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<EmployeeFilterOption[]>(res);
}

export async function deactivateEmployeeAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<{ member_id: string; name: string; email: string; status: string }> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(`${getApiUrl()}/employees/${targetMemberId}/deactivate`, {
    method: 'PATCH',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<{ member_id: string; name: string; email: string; status: string }>(res);
}
