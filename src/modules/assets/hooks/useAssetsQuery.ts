'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAssetDetailAction,
  fetchAssetMetaAction,
  fetchAssetSwapPreviewAction,
  fetchAssetsAction,
  fetchAssetCategoriesAction,
  fetchAvailableAssetGroupsAction,
  fetchEmployeeAssetViewAction,
  fetchReplacementsAction,
} from '@/modules/assets/api/assetServerActions';
import type {
  AssetCategoryDefinition,
  AssetDetail,
  ReplacementRecord,
  AssetFiltersState,
  AssetListResponse,
  AssetMetaResponse,
  AssetSwapPreview,
  AvailableAssetGroup,
  EmployeeAssetViewResponse,
} from '@/modules/assets/types/assetTypes';

export function useAssetsQuery(orgSlug: string, memberId: string, filters: AssetFiltersState) {
  return useQuery<AssetListResponse, Error>({
    queryKey: ['assets', orgSlug, filters],
    queryFn: () => fetchAssetsAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (previous) => previous,
  });
}

export function useAssetMetaQuery(orgSlug: string, memberId: string) {
  return useQuery<AssetMetaResponse, Error>({
    queryKey: ['assets-meta', orgSlug],
    queryFn: () => fetchAssetMetaAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useEmployeeAssetViewQuery(orgSlug: string, memberId: string) {
  return useQuery<EmployeeAssetViewResponse, Error>({
    queryKey: ['asset-employee-view', orgSlug, memberId],
    queryFn: () => fetchEmployeeAssetViewAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useAssetDetailQuery(orgSlug: string, memberId: string, assetId: string | null) {
  return useQuery<AssetDetail, Error>({
    queryKey: ['asset', orgSlug, assetId],
    queryFn: () => fetchAssetDetailAction({ orgSlug, memberId, assetId: assetId! }),
    enabled: !!orgSlug && !!memberId && !!assetId,
  });
}

export function useAssetCategoriesQuery(orgSlug: string, memberId: string) {
  return useQuery<AssetCategoryDefinition[], Error>({
    queryKey: ['asset-categories', orgSlug],
    queryFn: () => fetchAssetCategoriesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useAvailableAssetGroupsQuery(orgSlug: string, memberId: string) {
  return useQuery<AvailableAssetGroup[], Error>({
    queryKey: ['asset-available-groups', orgSlug],
    queryFn: () => fetchAvailableAssetGroupsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useAssetSwapPreviewQuery(
  orgSlug: string,
  memberId: string,
  maintenanceId: string | null,
) {
  return useQuery<AssetSwapPreview, Error>({
    queryKey: ['asset-swap-preview', orgSlug, maintenanceId],
    queryFn: () => fetchAssetSwapPreviewAction({ orgSlug, memberId, maintenanceId: maintenanceId! }),
    enabled: !!orgSlug && !!memberId && !!maintenanceId,
  });
}

export function useReplacementsQuery(orgSlug: string, memberId: string) {
  return useQuery<ReplacementRecord[], Error>({
    queryKey: ['replacements', orgSlug],
    queryFn: () => fetchReplacementsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
