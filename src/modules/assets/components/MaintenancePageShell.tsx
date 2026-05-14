'use client';

import { useMemo, useState } from 'react';
import { FileClock, Hammer, Wrench } from 'lucide-react';
import { useAssetDetailQuery, useAssetMetaQuery, useAssetsQuery } from '@/modules/assets/hooks/useAssetsQuery';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { MaintenanceKanbanBoard } from '@/modules/assets/components/MaintenanceKanbanBoard';
import type { AssetDetail } from '@/modules/assets/types/assetTypes';

export function MaintenancePageShell({
  orgSlug,
  memberId,
  canManageAssets,
}: {
  orgSlug: string;
  memberId: string;
  canManageAssets: boolean;
}) {
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<AssetDetail | null>(null);

  const allAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    page: 1,
    pageSize: 100,
  });

  const maintenanceAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    status: 'UNDER_MAINTENANCE',
    page: 1,
    pageSize: 100,
  });

  const detailQuery = useAssetDetailQuery(orgSlug, memberId, detailAssetId);
  const mutations = useAssetMutations(orgSlug, memberId);

  const allAssets = useMemo(() => allAssetsQuery.data?.items ?? [], [allAssetsQuery.data?.items]);
  const maintenanceAssets = useMemo(
    () => maintenanceAssetsQuery.data?.items ?? [],
    [maintenanceAssetsQuery.data?.items],
  );

  const selectedAsset = detailQuery.data ?? detailSnapshot;

  return (
    <div className="w-full">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border-2 border-[#e2e5ea] bg-[#f8f9fc]">
            <Wrench className="size-5 text-[#111827]" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">Maintenance</h1>
            <p className="mt-0.5 text-[14px] text-[#6b7280]">
              {canManageAssets ? 'Track and manage asset repairs and service requests' : 'Report an issue with your assigned assets'}
            </p>
          </div>
        </div>
      </div>

      <MaintenanceKanbanBoard
        maintenanceAssets={maintenanceAssets}
        allAssets={allAssets}
        detail={detailAssetId ? (detailQuery.data ?? detailSnapshot) : null}
        canManageAssets={canManageAssets}
        onOpenAssetDetail={(assetId) => { setDetailAssetId(assetId); setDetailSnapshot(null); }}
        onCreateMaintenance={(data) => mutations.createMaintenance.mutateAsync(data)}
        onUpdateMaintenance={(params) => mutations.updateMaintenance.mutateAsync(params)}
      />
    </div>
  );
}
