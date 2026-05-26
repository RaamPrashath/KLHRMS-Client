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
import { RevokeAndSwapDialog } from '@/modules/assets/components/RevokeAndSwapDialog';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { useMaintenanceTicketsQuery } from '@/modules/assets/hooks/useMaintenanceTicketsQuery';
import {
  KanbanBoard,
  MAINTENANCE_KANBAN_COLUMNS,
  MAINTENANCE_TICKET_STATUS_TO_COLUMN,
  type ColumnId,
} from '@/modules/maintenance/kanban';
import { MaintenanceTableView } from '@/modules/assets/components/MaintenanceTableView';
import { humanize } from '@/modules/assets/lib/assetUtils';
import {
  assetMaintenanceStatusOptions,
  assetMaintenanceTypeOptions,
} from '@/modules/assets/schema/assetSchemas';

const statusFilterOptions = [...assetMaintenanceStatusOptions];
const typeFilterOptions = [...assetMaintenanceTypeOptions];

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
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedSwapTicketId, setSelectedSwapTicketId] = useState<string | null>(null);

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.ticketId ?? '').toLowerCase().includes(q) ||
          (t.assetName ?? '').toLowerCase().includes(q) ||
          (t.issueDescription ?? '').toLowerCase().includes(q) ||
          (t.loggedByName ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter((t) => t.maintenanceType === typeFilter);
    }
    return result;
  }, [tickets, search, statusFilter, typeFilter]);

  const columnCounts = useMemo<Record<ColumnId, number>>(() => {
    const counts: Record<ColumnId, number> = {
      open: 0, in_progress: 0, done: 0, cancelled: 0,
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

  const hasActiveFilters = search.trim() || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  function clearFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  }

  function openSwapDialog(ticketId: string) {
    setSelectedSwapTicketId(ticketId);
    setSwapDialogOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-5 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Maintenance</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Track and manage asset repairs and service requests</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-full max-w-[320px] items-center gap-2.5 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc]/20 transition-all">
            <Search className="size-4 shrink-0 text-[#5f6673]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets..."
              className="h-auto border-0 bg-transparent px-0 py-0 text-[14px] shadow-none focus-visible:ring-0 placeholder:text-[#86868b]"
            />
          </div>

          <div className="inline-flex items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                viewMode === 'kanban'
                  ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
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
                  ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
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
            <span className="text-[14px] font-semibold text-[#4b5563]">Filters</span>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] rounded-lg border-[#e2e8f0] bg-white text-[12px] shadow-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {statusFilterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{humanize(opt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[150px] rounded-lg border-[#e2e8f0] bg-white text-[12px] shadow-none">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {typeFilterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{humanize(opt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-x-4 gap-y-2 text-[14px] text-[#4b5563]">
                {MAINTENANCE_KANBAN_COLUMNS.map((column) => (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => toggleCollapse(column.id)}
                    aria-pressed={Boolean(collapsed[column.id])}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] font-medium transition-all hover:bg-[#f1f3f7]',
                      collapsed[column.id] ? 'text-muted-foreground line-through opacity-60' : 'text-foreground',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', column.dot)} />
                    <span className="font-semibold text-foreground">{columnCounts[column.id]}</span>
                    <span>{column.title}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              {viewMode === 'table' && (
                <span className="text-[13px] font-medium text-muted-foreground">{filteredTickets.length} tickets</span>
              )}
              <div className="h-4 w-px bg-[#e2e8f0]" />
              <span className="text-[13px] font-medium text-muted-foreground">{totalCount} total</span>
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
      </div>

      <div className="min-h-0 flex-1">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tickets={filteredTickets}
            search=""
            collapsed={collapsed}
            onToggleColumn={toggleCollapse}
            onUpdateMaintenance={(params) => mutations.updateMaintenance.mutateAsync(params)}
            onOpenSwap={openSwapDialog}
          />
        ) : (
          <MaintenanceTableView tickets={filteredTickets} onOpenSwap={openSwapDialog} />
        )}
      </div>

      <RevokeAndSwapDialog
        key={selectedSwapTicketId ?? 'maintenance-swap'}
        open={swapDialogOpen}
        onOpenChange={setSwapDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        defaultMaintenanceId={selectedSwapTicketId}
        maintenanceOptions={filteredTickets.map((ticket) => ({
          id: ticket.id,
          ticketId: ticket.ticketId,
          maintenanceType: ticket.maintenanceType,
          status: ticket.status,
          issueDescription: ticket.issueDescription,
        }))}
      />
    </div>
  );
}
