'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type { DashboardOverviewResponse } from '@/modules/dashboard/types/dashboardTypes';

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // Keep the default status message.
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchDashboardOverviewAction(params: {
  orgSlug: string;
  memberId: string;
  today: string;
}): Promise<DashboardOverviewResponse> {
  const query = new URLSearchParams({ today: params.today });
  const res = await fetch(`${getApiUrl()}/dashboard?${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DashboardOverviewResponse>(res);
}
