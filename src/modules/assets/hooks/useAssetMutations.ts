'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAssetAction,
  createAssetMaintenanceAction,
  deleteAssetAction,
  provideAssetAction,
  returnAssetAction,
  updateAssetAction,
  updateAssetMaintenanceAction,
} from '@/modules/assets/api/assetServerActions';

export function useAssetMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const invalidateAll = async (assetId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['assets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-meta', orgSlug] });
    if (assetId) {
      await queryClient.invalidateQueries({ queryKey: ['asset', orgSlug, assetId] });
    }
  };

  return {
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
    provideAsset: useMutation({
      mutationFn: (data: Parameters<typeof provideAssetAction>[0]['data']) =>
        provideAssetAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
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
  };
}
