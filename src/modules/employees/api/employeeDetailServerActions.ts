'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  EmployeeDetail,
  EmployeeDirectReportsResponse,
  EmployeeGroupListResponse,
  EmployeeManagerChainResponse,
  EmployeePersonBrief,
  EmployeeRefreshResult,
  UpdateEmployeeDetailsInput,
  UpdateEmployeeDetailsResponse,
} from '@/modules/employees/types/employeeDetailTypes';

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

function toAbsoluteApiUrl(url: string | null): string | null {
  if (
    !url ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  return `${getApiUrl().replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

function absolutizePersonImage(
  person: EmployeePersonBrief | null,
): EmployeePersonBrief | null {
  if (!person) return person;
  return { ...person, image: toAbsoluteApiUrl(person.image) };
}

function absolutizeDetail(detail: EmployeeDetail): EmployeeDetail {
  return {
    ...detail,
    image: toAbsoluteApiUrl(detail.image),
    profile_photo_url: toAbsoluteApiUrl(detail.profile_photo_url),
    manager: absolutizePersonImage(detail.manager),
    direct_reports: detail.direct_reports.map((p) => absolutizePersonImage(p) as EmployeePersonBrief),
  };
}

export async function fetchEmployeeDetailAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<EmployeeDetail> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(`${getApiUrl()}/employees/${targetMemberId}`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  const data = await handleResponse<EmployeeDetail>(res);
  return absolutizeDetail(data);
}

export async function fetchMyEmployeeProfileAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<EmployeeDetail> {
  const { orgSlug, memberId } = params;
  const res = await fetch(`${getApiUrl()}/employees/me`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  const data = await handleResponse<EmployeeDetail>(res);
  return absolutizeDetail(data);
}

export async function fetchEmployeeDirectReportsAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<EmployeeDirectReportsResponse> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(
    `${getApiUrl()}/employees/${targetMemberId}/direct-reports`,
    {
      method: 'GET',
      headers: buildHeaders(orgSlug, memberId),
      cache: 'no-store',
    },
  );
  const data = await handleResponse<EmployeeDirectReportsResponse>(res);
  return {
    ...data,
    direct_reports: data.direct_reports.map(
      (p) => absolutizePersonImage(p) as EmployeePersonBrief,
    ),
  };
}

export async function fetchEmployeeGroupsAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<EmployeeGroupListResponse> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(`${getApiUrl()}/employees/${targetMemberId}/groups`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<EmployeeGroupListResponse>(res);
}

export async function fetchEmployeeManagerChainAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<EmployeeManagerChainResponse> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(
    `${getApiUrl()}/employees/${targetMemberId}/manager-chain`,
    {
      method: 'GET',
      headers: buildHeaders(orgSlug, memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<EmployeeManagerChainResponse>(res);
}

export async function refreshEmployeeFromGraphAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
}): Promise<EmployeeRefreshResult> {
  const { orgSlug, memberId, targetMemberId } = params;
  const res = await fetch(
    `${getApiUrl()}/employees/${targetMemberId}/refresh-from-graph`,
    {
      method: 'POST',
      headers: buildHeaders(orgSlug, memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<EmployeeRefreshResult>(res);
}

export async function updateEmployeeDetailsAction(params: {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
  payload: UpdateEmployeeDetailsInput;
}): Promise<UpdateEmployeeDetailsResponse> {
  const { orgSlug, memberId, targetMemberId, payload } = params;
  const res = await fetch(`${getApiUrl()}/employees/${targetMemberId}`, {
    method: 'PUT',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return handleResponse<UpdateEmployeeDetailsResponse>(res);
}
