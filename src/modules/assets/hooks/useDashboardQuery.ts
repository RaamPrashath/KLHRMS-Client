'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAssetBrandModelAnalyticsAction,
  fetchAssetDashboardAction,
  fetchAssetOsDistributionAction,
  fetchAssetWarrantyFeedAction,
} from '@/modules/assets/api/assetServerActions';
import type {
  BrandModelInventoryAnalytics,
  DashboardData,
  OsDistributionAnalytics,
  WarrantyExpirationFeedData,
} from '@/modules/assets/components/dashboard/dashboard.types';

export function useDashboardQuery(orgSlug: string, memberId: string) {
  return useQuery<DashboardData, Error>({
    queryKey: ['assets-dashboard', orgSlug],
    queryFn: () => fetchAssetDashboardAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useBrandModelAnalyticsQuery(orgSlug: string, memberId: string) {
  return useQuery<BrandModelInventoryAnalytics, Error>({
    queryKey: ['assets-brand-model-analytics', orgSlug],
    queryFn: () => fetchAssetBrandModelAnalyticsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWarrantyFeedQuery(orgSlug: string, memberId: string) {
  return useQuery<WarrantyExpirationFeedData, Error>({
    queryKey: ['assets-warranty-feed', orgSlug],
    queryFn: () => fetchAssetWarrantyFeedAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60,
  });
}

export function useOsDistributionQuery(orgSlug: string, memberId: string) {
  return useQuery<OsDistributionAnalytics, Error>({
    queryKey: ['assets-os-distribution', orgSlug],
    queryFn: () => fetchAssetOsDistributionAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
