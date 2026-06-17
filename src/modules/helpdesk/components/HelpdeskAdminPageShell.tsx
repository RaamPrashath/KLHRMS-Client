'use client';

import { useMemo, useState } from 'react';
import { Columns, LayoutPanelTop, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { MaintenanceTableView } from '@/modules/assets/components/MaintenanceTableView';
import {
  KanbanBoard,
  MAINTENANCE_KANBAN_COLUMNS,
  MAINTENANCE_TICKET_STATUS_TO_COLUMN,
  type ColumnId,
} from '@/modules/maintenance/kanban';
import { humanize } from '@/modules/assets/lib/assetUtils';
import { assetMaintenanceStatusOptions, helpdeskCategoryOptions } from '@/modules/assets/schema/assetSchemas';
import type { AssetMaintenanceStatus } from '@/modules/assets/types/assetTypes';
import { useHelpdeskAdminTicketsQuery } from '@/modules/helpdesk/hooks/useHelpdeskAdminTicketsQuery';

const statusFilterOptions = [...assetMaintenanceStatusOptions];
const typeFilterOptions = [...helpdeskCategoryOptions];

export function HelpdeskAdminPageShell({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const ticketsQuery = useHelpdeskAdminTicketsQuery(orgSlug, memberId);
  const mutations = useAssetMutations(orgSlug, memberId);

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (ticket) =>
          (ticket.ticketId ?? '').toLowerCase().includes(q) ||
          (ticket.assetName ?? '').toLowerCase().includes(q) ||
          (ticket.subject ?? '').toLowerCase().includes(q) ||
          (ticket.issueDescription ?? '').toLowerCase().includes(q) ||
          (ticket.loggedByName ?? '').toLowerCase().includes(q) ||
          (ticket.cancelledByName ?? '').toLowerCase().includes(q) ||
          (ticket.assetLifecycleStatusLabel ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((ticket) => ticket.status === statusFilter);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter((ticket) => ticket.maintenanceType === typeFilter);
    }
    return result;
  }, [tickets, search, statusFilter, typeFilter]);

  const columnCounts = useMemo<Record<ColumnId, number>>(() => {
    const counts: Record<ColumnId, number> = {
      open: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };
    for (const ticket of filteredTickets) {
      const columnId = MAINTENANCE_TICKET_STATUS_TO_COLUMN[ticket.status] || 'open';
      counts[columnId] += 1;
    }
    return counts;
  }, [filteredTickets]);

  const totalCount = useMemo(
    () => MAINTENANCE_KANBAN_COLUMNS.reduce((sum, column) => sum + columnCounts[column.id], 0),
    [columnCounts],
  );

  function toggleCollapse(columnId: ColumnId) {
    setCollapsed((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  }

  const hasActiveFilters = !!search.trim() || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  function clearFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-5 shrink-0 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Helpdesk</h1>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            Track HR, IT, finance, and general employee requests in one board, using the same move-to-next-stage flow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                viewMode === 'kanban'
                  ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-neutral-500 hover:text-neutral-900',
              )}
              title="Kanban view"
            >
              <LayoutPanelTop className="size-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-neutral-500 hover:text-neutral-900',
              )}
              title="Table view"
            >
              <Columns className="size-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-[#e6e9ef] bg-[#fbfbfc] px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-[360px] items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc]/20 transition-all">
              <Search className="size-3.5 shrink-0 text-[#5f6673]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests..."
                className="h-auto border-0 bg-transparent px-0 py-0 text-[12px] shadow-none focus-visible:ring-0 placeholder:text-[#86868b]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[14px] font-semibold text-[#4b5563]">Filters</span>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[150px] rounded-lg border-[#e2e8f0] bg-white text-[12px] shadow-none">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Category</SelectItem>
                {typeFilterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {humanize(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-[#e2e8f0] mx-1" />
            <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">{totalCount} total</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 rounded-lg px-2 text-[12px] text-[#6e6e73] hover:text-[#1d1d1f]"
              >
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tickets={filteredTickets}
            search=""
            collapsed={collapsed}
            onToggleColumn={toggleCollapse}
            onUpdateMaintenance={(params) => mutations.updateMaintenance.mutateAsync(params)}
          />
        ) : (
          <MaintenanceTableView
            tickets={filteredTickets}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            statusFilterOptions={statusFilterOptions}
            typeFilterOptions={typeFilterOptions}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            hideCondition={true}
          />
        )}
      </div>
    </div>
  );
}
