'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAssetIdAction,
  deleteAssetIdAction,
  fetchAssetIdsAction,
  updateAssetIdAction,
} from '@/modules/assets/api/assetServerActions';
import type { AssetIdDefinition } from '@/modules/assets/types/assetTypes';

export function useAssetIdsQuery(orgSlug: string, memberId: string) {
  return useQuery<AssetIdDefinition[], Error>({
    queryKey: ['asset-ids', orgSlug],
    queryFn: () => fetchAssetIdsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useAssetIdMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['asset-ids', orgSlug] });
  };

  return {
    createAssetId: useMutation({
      mutationFn: (data: { assetIdName: string }) =>
        createAssetIdAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidate(),
    }),
    updateAssetId: useMutation({
      mutationFn: ({
        assetIdId,
        data,
      }: {
        assetIdId: string;
        data: { assetIdName?: string };
      }) => updateAssetIdAction({ orgSlug, memberId, assetIdId, data }),
      onSuccess: async () => invalidate(),
    }),
    deleteAssetId: useMutation({
      mutationFn: (assetIdId: string) =>
        deleteAssetIdAction({ orgSlug, memberId, assetIdId }),
      onSuccess: async () => invalidate(),
    }),
  };
}
