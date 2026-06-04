'use client';

import { useQuery } from '@tanstack/react-query';
import { getHrmsApiUrl } from '@/lib/deployment-env';
import type { LeaveRequestListResponse } from '@/modules/leave/types/leaveTypes';

async function fetchAllLeaveRequests(orgSlug: string, memberId: string): Promise<LeaveRequestListResponse> {
  const res = await fetch(
    `${getHrmsApiUrl()}/leaves/requests?page=1&pageSize=500`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-slug': orgSlug,
        'x-membership-id': memberId,
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail ?? `Request failed with status ${res.status}`;
    throw new Error(JSON.stringify({ status: res.status, message }));
  }
  return res.json();
}

export function useLeaveHistory(orgSlug: string, memberId: string) {
  const query = useQuery<LeaveRequestListResponse, Error>({
    queryKey: ['leave-history', orgSlug],
    queryFn: () => fetchAllLeaveRequests(orgSlug, memberId),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (prev) => prev,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
