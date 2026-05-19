'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bulkCreateAssetsAction,
  createAssetAction,
  createAssetCategoryAction,
  createAssetCategoryFieldAction,
  createAssetMaintenanceAction,
  deleteAssetAction,
  deleteAssetCategoryAction,
  deleteAssetCategoryFieldAction,
  issueAssetsAction,
  returnAssetAction,
  updateAssetAction,
  updateAssetCategoryAction,
  updateAssetCategoryFieldAction,
  updateAssetMaintenanceAction,
} from '@/modules/assets/api/assetServerActions';

export function useAssetMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const invalidateAll = async (assetId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['assets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-meta', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['asset-categories', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['asset-available-groups', orgSlug] });
    if (assetId) {
      await queryClient.invalidateQueries({ queryKey: ['asset', orgSlug, assetId] });
    }
  };

  return {
    bulkCreateAssets: useMutation({
      mutationFn: (data: Parameters<typeof bulkCreateAssetsAction>[0]['data']) =>
        bulkCreateAssetsAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    issueAssets: useMutation({
      mutationFn: (data: Parameters<typeof issueAssetsAction>[0]['data']) =>
        issueAssetsAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    createAsset: useMutation({
      mutationFn: (data: Parameters<typeof createAssetAction>[0]['data']) =>
        createAssetAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    updateAsset: useMutation({
      mutationFn: ({ assetId, data }: { assetId: string; data: Parameters<typeof updateAssetAction>[0]['data'] }) =>
        updateAssetAction({ orgSlug, memberId, assetId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    archiveAsset: useMutation({
      mutationFn: (assetId: string) => deleteAssetAction({ orgSlug, memberId, assetId }),
      onSuccess: async () => invalidateAll(),
    }),
    returnAsset: useMutation({
      mutationFn: (data: Parameters<typeof returnAssetAction>[0]['data']) =>
        returnAssetAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    createMaintenance: useMutation({
      mutationFn: (data: Parameters<typeof createAssetMaintenanceAction>[0]['data']) =>
        createAssetMaintenanceAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    updateMaintenance: useMutation({
      mutationFn: ({
        assetId,
        data,
      }: {
        assetId: string;
        data: Parameters<typeof updateAssetMaintenanceAction>[0]['data'];
      }) => updateAssetMaintenanceAction({ orgSlug, memberId, assetId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    createCategory: useMutation({
      mutationFn: (data: { name: string; description?: string; assetCode?: string | null }) =>
        createAssetCategoryAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    updateCategory: useMutation({
      mutationFn: ({
        categoryId,
        data,
      }: {
        categoryId: string;
        data: { name?: string; description?: string; assetCode?: string | null };
      }) => updateAssetCategoryAction({ orgSlug, memberId, categoryId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    deleteCategory: useMutation({
      mutationFn: (categoryId: string) => deleteAssetCategoryAction({ orgSlug, memberId, categoryId }),
      onSuccess: async () => invalidateAll(),
    }),
    createCategoryField: useMutation({
      mutationFn: ({
        categoryId,
        data,
      }: {
        categoryId: string;
        data: {
          fieldName: string;
          fieldType: string;
          fieldOptions?: string[];
          isRequired?: boolean;
          displayOrder?: number;
        };
      }) => createAssetCategoryFieldAction({ orgSlug, memberId, categoryId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    updateCategoryField: useMutation({
      mutationFn: ({
        fieldId,
        data,
      }: {
        fieldId: string;
        data: {
          fieldName?: string;
          fieldType?: string;
          fieldOptions?: string[] | null;
          isRequired?: boolean;
          displayOrder?: number;
        };
      }) => updateAssetCategoryFieldAction({ orgSlug, memberId, fieldId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    deleteCategoryField: useMutation({
      mutationFn: (fieldId: string) => deleteAssetCategoryFieldAction({ orgSlug, memberId, fieldId }),
      onSuccess: async () => invalidateAll(),
    }),
  };
}
