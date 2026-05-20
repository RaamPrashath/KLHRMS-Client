'use client';

import { useMemo } from 'react';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { useMaintenanceTicketsQuery } from '@/modules/assets/hooks/useMaintenanceTicketsQuery';
import { KanbanBoard } from '@/modules/maintenance/kanban';

export function MaintenancePageShell({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const ticketsQuery = useMaintenanceTicketsQuery(orgSlug, memberId);
  const mutations = useAssetMutations(orgSlug, memberId);

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Maintenance</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Track and manage asset repairs and service requests</p>
      </div>

      <div className="min-h-0 flex-1">
        <KanbanBoard
          tickets={tickets}
          onUpdateMaintenance={(params) => mutations.updateMaintenance.mutateAsync(params as any)}
        />
      </div>
    </div>
  );
}
