'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Hammer,
  LaptopMinimal,
  Search,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FloatingPanelBody,
  FloatingPanelCloseButton,
  FloatingPanelContent,
  FloatingPanelRoot,
  useFloatingPanel,
} from '@/components/ui/floating-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { conditionBadge, formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { MaintenanceTicket } from '@/modules/assets/api/assetServerActions';
import type { AssetCondition } from '@/modules/assets/types/assetTypes';

const PAGE_SIZE = 10;

const statusStyle: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  OPEN: { dot: '#2563eb', label: 'Open', bg: 'bg-blue-50', text: 'text-blue-700' },
  IN_PROGRESS: { dot: '#d97706', label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700' },
  COMPLETED: { dot: '#10b981', label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELLED: { dot: '#6b7280', label: 'Cancelled', bg: 'bg-neutral-100', text: 'text-neutral-600' },
};

const lifecycleStyle: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700' },
  PENDING_RETURN: { bg: 'bg-amber-50', text: 'text-amber-700' },
  RETURNED_IN_REPAIR: { bg: 'bg-orange-50', text: 'text-orange-700' },
  RETURNED_READY: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  IN_MAINTENANCE: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

const priorityStyle: Record<string, { dot: string; label: string }> = {
  high: { dot: '#dc2626', label: 'High' },
  medium: { dot: '#d97706', label: 'Medium' },
  low: { dot: '#6b7280', label: 'Low' },
};

function resolvePriority(t: MaintenanceTicket): 'high' | 'medium' | 'low' {
  const desc = (t.issueDescription || '').toLowerCase();
  const cond = (t.assetCondition || '').toUpperCase();
  const type = (t.maintenanceType || '').toLowerCase();
  if (desc.includes('critical') || desc.includes('failure') || desc.includes('broken') || desc.includes('emergency') || cond === 'POOR' || type.includes('critical')) return 'high';
  if (desc.includes('medium') || desc.includes('calibration') || desc.includes('warning') || cond === 'FAIR') return 'medium';
  return 'low';
}

const STATUS_DOT: Record<string, string> = {
  OPEN: 'bg-[#3b82f6]',
  IN_PROGRESS: 'bg-[#eab308]',
  COMPLETED: 'bg-[#22c55e]',
  CANCELLED: 'bg-[#9ca3af]',
};

function StatusDot({ status }: { status: string }) {
  const label = status === 'IN_PROGRESS' ? 'In Progress' : humanize(status);
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[status] || 'bg-[#9ca3af]')} />
      <span className="text-[13px] text-slate-707 dark:text-slate-350 font-medium">{label}</span>
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-[#f0f0f2] py-2.5 last:border-b-0">
      <span className="text-[12px] font-medium text-neutral-400">{label}</span>
      <span className="min-w-0 text-[13px] leading-5 text-[#1d1d1f]">{value || 'Not recorded'}</span>
    </div>
  );
}

function TicketDetailPanel({ ticket }: { ticket: MaintenanceTicket }) {
  return (
    <FloatingPanelContent className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(34rem,calc(100vh-2rem))] overflow-hidden rounded-[18px] border-[#e5e5ea] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
      <FloatingPanelBody className="max-h-[calc(min(34rem,100vh-2rem)-2.75rem)] overflow-y-auto px-4 pb-4 pt-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-neutral-400">{ticket.maintenanceType ? humanize(ticket.maintenanceType) : ''}</p>
          </div>
          <FloatingPanelCloseButton className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7]" />
        </div>

        <div className="rounded-2xl bg-[#f5f5f7] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f]">
            <BadgeCheck className="size-4 text-primary" />
            {statusStyle[ticket.status]?.label ?? humanize(ticket.status)}
          </div>
        </div>

        <div className="mt-3">
          <DetailRow label="Asset" value={ticket.assetName} />
          <DetailRow label="Code" value={ticket.assetCode} />
          <DetailRow label="Type" value={ticket.maintenanceType ? humanize(ticket.maintenanceType) : null} />
          <DetailRow label="Reported By" value={ticket.loggedByName} />
          <DetailRow label="Asset State" value={ticket.assetLifecycleStatusLabel} />
          <DetailRow
            label="Replacement"
            value={ticket.replacementDecision ? humanize(ticket.replacementDecision) : 'Pending'}
          />
          <DetailRow label="Date" value={ticket.createdAt ? formatDate(ticket.createdAt) : null} />
          <DetailRow
            label="Swap Path"
            value={
              ticket.swapPreview
                ? `${ticket.swapPreview.options[0]?.availableCount ?? 0} exact model / ${ticket.swapPreview.options[1]?.availableCount ?? 0} temporary backup`
                : null
            }
          />
        </div>

        {ticket.issueDescription && (
          <div className="mt-4 border-t border-[#f0f0f2] pt-4">
            <span className="text-[12px] font-medium text-neutral-400">Issue Description</span>
            <p className="mt-1.5 text-[13px] leading-5 text-[#1d1d1f]">{ticket.issueDescription}</p>
            {ticket.swapPreview?.reason && (
              <div className="mt-3 rounded-2xl border border-[#eef0f3] bg-[#fbfbfc] px-3 py-2.5 text-[12px] leading-5 text-[#5f6673]">
                {ticket.swapPreview.reason}
              </div>
            )}
          </div>
        )}
      </FloatingPanelBody>
    </FloatingPanelContent>
  );
}

interface TableInnerProps {
  tickets: MaintenanceTicket[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  typeFilter: string;
  onTypeChange: (val: string) => void;
  statusFilterOptions: string[];
  typeFilterOptions: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  className?: string;
  hideCondition?: boolean;
}

function TableInner({
  tickets,
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  statusFilterOptions,
  typeFilterOptions,
  hasActiveFilters,
  onClearFilters,
  className,
  hideCondition = false,
}: TableInnerProps) {
  const { openFloatingPanel, setTitle } = useFloatingPanel();
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });

  const data = useMemo(() => tickets, [tickets]);

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'ticketId',
        header: 'Ticket No.',
        accessorFn: (row: MaintenanceTicket) => row.ticketId,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-mono text-muted-foreground font-medium">
            {getValue()}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'asset',
        header: 'Asset',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => {
          const ticket = row.original;
          return (
            <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
              {ticket.assetName || '—'}
            </span>
          );
        },
      },
      {
        id: 'maintenanceType',
        header: 'Category',
        accessorFn: (row: MaintenanceTicket) => row.maintenanceType,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-muted-foreground font-medium">{humanize(getValue())}</span>
        ),
      },
      {
        id: 'loggedByName',
        header: 'Holder',
        accessorFn: (row: MaintenanceTicket) => row.loggedByName ?? '—',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-slate-707 dark:text-slate-350 font-medium">{getValue()}</span>
        ),
      },
      ...(hideCondition ? [] : [{
        id: 'assetCondition',
        header: 'Condition',
        accessorFn: (row: MaintenanceTicket) => row.assetCondition ?? 'GOOD',
        cell: ({ getValue }: { getValue: () => string }) => {
          const condition = getValue();
          return (
            <Badge
              className={cn(
                'rounded-md border-0 px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                conditionBadge(condition as AssetCondition),
              )}
            >
              {humanize(condition)}
            </Badge>
          );
        },
      }]),
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: MaintenanceTicket) => row.status,
        cell: ({ getValue }: { getValue: () => string }) => <StatusDot status={getValue()} />,
      },
      {
        id: 'createdAt',
        header: 'Date',
        accessorFn: (row: MaintenanceTicket) => row.createdAt,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-medium text-muted-foreground">{formatDate(getValue())}</span>
        ),
        enableSorting: true,
      },
    ];
    return cols;
  }, [hideCondition]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const { rows } = table.getRowModel();

  function handleRowClick(ticket: MaintenanceTicket) {
    setSelectedTicket(ticket);
    setTitle(ticket.ticketId);
    openFloatingPanel(new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0));
  }

  const paginationPages = useMemo(() => {
    const pageCount = table.getPageCount();
    const pageIndex = table.getState().pagination.pageIndex;
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (pageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (pageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [table]);

  return (
    <div className={cn('bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col', className)}>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-wider font-bold"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="flex items-center gap-1 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors font-bold uppercase tracking-wider"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="flex flex-col">
                            <ChevronUp className={cn('size-3 -mb-1', header.column.getIsSorted() === 'asc' ? 'text-foreground' : 'text-[#d2d2d7]')} />
                            <ChevronDown className={cn('size-3', header.column.getIsSorted() === 'desc' ? 'text-foreground' : 'text-[#d2d2d7]')} />
                          </span>
                        )}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-[13px] text-[#6e6e73]">
                  No matching tickets
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && (
        <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
          <span className="font-semibold text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
            {' '}of {data.length} entries
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
            >
              Previous
            </Button>
            {paginationPages.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                  &hellip;
                </span>
              ) : (
                <Button
                  key={p}
                  variant={table.getState().pagination.pageIndex === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => table.setPageIndex(p)}
                  className={cn(
                    'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                    table.getState().pagination.pageIndex === p
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border text-muted-foreground bg-card hover:bg-muted',
                  )}
                >
                  {p + 1}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedTicket && <TicketDetailPanel ticket={selectedTicket} />}
    </div>
  );
}

export interface MaintenanceTableViewProps {
  tickets: MaintenanceTicket[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  typeFilter: string;
  onTypeChange: (val: string) => void;
  statusFilterOptions: string[];
  typeFilterOptions: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  className?: string;
  hideCondition?: boolean;
}

export function MaintenanceTableView({
  tickets,
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  statusFilterOptions,
  typeFilterOptions,
  hasActiveFilters,
  onClearFilters,
  className,
  hideCondition = false,
}: MaintenanceTableViewProps) {
  const data = useMemo(() => tickets, [tickets]);

  if (!data.length && !hasActiveFilters) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f9fafb]">
          <Hammer className="size-5 text-[#9ca3af]" />
        </div>
        <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">No maintenance tickets</p>
        <p className="mt-0.5 text-[13px] text-[#6e6e73]">Tickets will appear here once assets are reported</p>
      </div>
    );
  }

  return (
    <FloatingPanelRoot>
      <TableInner
        tickets={data}
        search={search}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        typeFilter={typeFilter}
        onTypeChange={onTypeChange}
        statusFilterOptions={statusFilterOptions}
        typeFilterOptions={typeFilterOptions}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        className={className}
        hideCondition={hideCondition}
      />
    </FloatingPanelRoot>
  );
}
