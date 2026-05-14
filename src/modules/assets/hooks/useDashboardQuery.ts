'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAssetDashboardAction } from '@/modules/assets/api/assetServerActions';
import type { DashboardData } from '@/modules/assets/components/dashboard/dashboard.types';

export function useDashboardQuery(orgSlug: string, memberId: string) {
  return useQuery<DashboardData, Error>({
    queryKey: ['assets-dashboard', orgSlug],
    queryFn: () => fetchAssetDashboardAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
