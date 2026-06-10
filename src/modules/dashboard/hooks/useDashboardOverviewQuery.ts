'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDashboardOverviewAction } from '@/modules/dashboard/api/dashboardServerActions';
import type { DashboardOverviewResponse } from '@/modules/dashboard/types/dashboardTypes';

export const dashboardQueryKeys = {
  overview: (orgSlug: string, memberId: string, today: string) =>
    ['dashboard-overview', orgSlug, memberId, today] as const,
};

export function useDashboardOverviewQuery(
  orgSlug: string,
  memberId: string,
  today: string,
) {
  return useQuery<DashboardOverviewResponse, Error>({
    queryKey: dashboardQueryKeys.overview(orgSlug, memberId, today),
    queryFn: () => fetchDashboardOverviewAction({ orgSlug, memberId, today }),
    enabled: !!orgSlug && !!memberId && !!today,
    staleTime: 30_000,
  });
}
