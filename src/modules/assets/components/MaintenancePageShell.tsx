'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { useMaintenanceTicketsQuery } from '@/modules/assets/hooks/useMaintenanceTicketsQuery';
import {
  KanbanBoard,
  MAINTENANCE_KANBAN_COLUMNS,
  MAINTENANCE_TICKET_STATUS_TO_COLUMN,
  type ColumnId,
} from '@/modules/maintenance/kanban';

export function MaintenancePageShell({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const ticketsQuery = useMaintenanceTicketsQuery(orgSlug, memberId);
  const mutations = useAssetMutations(orgSlug, memberId);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const columnCounts = useMemo<Record<ColumnId, number>>(() => {
    const counts: Record<ColumnId, number> = {
      open: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };

    for (const ticket of tickets) {
      const columnId = MAINTENANCE_TICKET_STATUS_TO_COLUMN[ticket.status] || 'open';
      counts[columnId] += 1;
    }

    return counts;
  }, [tickets]);
  const totalCount = useMemo(
    () => MAINTENANCE_KANBAN_COLUMNS.reduce((sum, column) => sum + columnCounts[column.id], 0),
    [columnCounts],
  );

  function toggleCollapse(columnId: ColumnId) {
    setCollapsed((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-5 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Maintenance</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Track and manage asset repairs and service requests</p>
        </div>

        {/* Standalone Pill Search Input - Completely outside the toolbar border */}
        <div className="flex h-10 w-full max-w-[360px] items-center gap-2.5 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc]/20 transition-all">
          <Search className="size-4 shrink-0 text-[#5f6673]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tickets..."
            className="h-auto border-0 bg-transparent px-0 py-0 text-[14px] shadow-none focus-visible:ring-0 placeholder:text-[#86868b]"
          />
        </div>
      </div>

      {/* Status Filter Toolbar - Lives on a separate border */}
      <div className="mb-5 flex shrink-0 items-center justify-between rounded-xl border border-[#e6e9ef] bg-[#fbfbfc] px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <span className="text-[14px] font-semibold text-[#4b5563]">Status Filters</span>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-[14px] text-[#4b5563]">
          {MAINTENANCE_KANBAN_COLUMNS.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => toggleCollapse(column.id)}
              aria-pressed={Boolean(collapsed[column.id])}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] font-medium transition-all hover:bg-[#f1f3f7]",
                collapsed[column.id] ? "text-muted-foreground line-through opacity-60" : "text-foreground"
              )}
            >
              <span className={cn('size-2 rounded-full', column.dot)} />
              <span className="font-semibold text-foreground">{columnCounts[column.id]}</span>
              <span>{column.title}</span>
            </button>
          ))}
          <div className="h-4 w-px bg-[#e2e8f0]" />
          <span className="text-[13px] font-medium text-muted-foreground">{totalCount} total</span>
        </div>
      </div>

      {/* Kanban Board Container - No enclosing outer border box */}
      <div className="min-h-0 flex-1">
        <KanbanBoard
          tickets={tickets}
          search={search}
          collapsed={collapsed}
          onToggleColumn={toggleCollapse}
          onUpdateMaintenance={(params) => mutations.updateMaintenance.mutateAsync(params)}
        />
      </div>
    </div>
  );
}
