'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { humanize } from '@/modules/assets/lib/assetUtils';
import { useArchivedTicketsQuery } from '@/modules/assets/hooks/useArchivedTicketsQuery';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import type { MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

const PAGE_SIZE = 10;

const statusStyle: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  OPEN: { dot: '#2563eb', label: 'Open', bg: 'bg-blue-50', text: 'text-blue-700' },
  IN_PROGRESS: { dot: '#d97706', label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700' },
  COMPLETED: { dot: '#10b981', label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELLED: { dot: '#6b7280', label: 'Cancelled', bg: 'bg-neutral-100', text: 'text-neutral-600' },
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function ArchivedTicketsPageShell({
  orgSlug,
  memberId,
  initialTicketMode,
}: {
  orgSlug: string;
  memberId: string;
  initialTicketMode?: string;
}) {
  const router = useRouter();
  const mutations = useAssetMutations(orgSlug, memberId);
  const ticketsQuery = useArchivedTicketsQuery(orgSlug, memberId);

  const [ticketModeFilter, setTicketModeFilter] = useState(initialTicketMode ?? 'ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const filteredTickets = useMemo(() => {
    let result = ticketsQuery.data ?? [];
    if (ticketModeFilter !== 'ALL') {
      result = result.filter((t) => t.ticketMode === ticketModeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.ticketId ?? '').toLowerCase().includes(q) ||
          (t.assetName ?? '').toLowerCase().includes(q) ||
          (t.subject ?? '').toLowerCase().includes(q) ||
          (t.issueDescription ?? '').toLowerCase().includes(q) ||
          (t.loggedByName ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }
    return result;
  }, [ticketsQuery.data, ticketModeFilter, search, statusFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'ticketId',
        header: 'Ticket No.',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <span className="font-medium text-foreground">{row.original.ticketId}</span>
        ),
      },
      {
        accessorKey: 'assetName',
        header: 'Asset / Subject',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <div className="max-w-[200px]">
            <p className="truncate text-[13px] font-medium text-foreground">
              {row.original.assetName || row.original.subject || '-'}
            </p>
            {row.original.assetCode && (
              <p className="truncate text-[11px] text-muted-foreground">{row.original.assetCode}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'maintenanceType',
        header: 'Category',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <span className="text-[13px] text-muted-foreground">
            {humanize(row.original.maintenanceType)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => {
          const style = statusStyle[row.original.status] ?? statusStyle.OPEN;
          return (
            <Badge variant="secondary" className={cn('gap-1.5 font-medium', style.bg, style.text)}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
              {style.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'loggedByName',
        header: 'Logged By',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <span className="text-[13px] text-muted-foreground">
            {row.original.loggedByName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <span className="text-[13px] text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: 'archivedAt',
        header: 'Archived',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <span className="text-[13px] text-muted-foreground">
            {formatDate(row.original.archivedAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }: { row: { original: MaintenanceTicket } }) => (
          <Button
            size="sm"
            className="inline-flex h-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-3 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)] hover:opacity-95 transition-all duration-200 gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => mutations.unarchiveTicket.mutateAsync(row.original.id)}
            disabled={mutations.unarchiveTicket.isPending}
          >
            <ArchiveRestore className="size-3.5" />
            Restore
          </Button>
        ),
      },
    ],
    [mutations.unarchiveTicket],
  );

  const table = useReactTable({
    data: filteredTickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  const backUrl =
    ticketModeFilter === 'GENERAL_HELP_REQUEST'
      ? `/${orgSlug}/helpdesk`
      : `/${orgSlug}/asset-maintenance`;

  const hasActiveFilters = !!search.trim() || statusFilter !== 'ALL' || ticketModeFilter !== 'ALL';

  function clearFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setTicketModeFilter('ALL');
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-5 shrink-0 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Archived Tickets
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            Completed and cancelled tickets older than 1 day.
          </p>
        </div>
      </div>

      <div className="mb-5 shrink-0">
        <div className="inline-flex items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
          {[
            { value: 'ALL', label: 'All' },
            { value: 'ASSET_ISSUE', label: 'Asset Maintenance' },
            { value: 'GENERAL_HELP_REQUEST', label: 'Helpdesk' },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setTicketModeFilter(mode.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all',
                ticketModeFilter === mode.value
                  ? 'bg-gradient-to-br from-[#3862f6] to-[#6366f1] text-white shadow-[0_2px_8px_rgba(56,98,246,0.15)]'
                  : 'text-neutral-500 hover:text-neutral-900',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 shrink-0 flex items-center gap-3 rounded-xl border border-[#e6e9ef] bg-[#fbfbfc] px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex h-8 w-[240px] items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-[#0066cc] focus-within:ring-1 focus-within:ring-[#0066cc]/20 transition-all">
          <Search className="size-3.5 shrink-0 text-[#5f6673]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search archived tickets..."
            className="h-auto border-0 bg-transparent px-0 py-0 text-[12px] shadow-none focus-visible:ring-0 placeholder:text-[#86868b]"
          />
        </div>

        <span className="text-[14px] font-semibold text-[#4b5563]">Filters</span>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] rounded-lg border-[#e2e8f0] bg-white text-[12px] shadow-none">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-[#e2e8f0] mx-1" />
        <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">
          {filteredTickets.length} total
        </span>
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

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#e6e9ef] bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 bg-[#fbfbfc] text-[11px] font-semibold uppercase tracking-wider text-[#8b94a3]"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={cn(
                          'flex items-center gap-1 text-left',
                          header.column.getCanSort() && 'cursor-pointer select-none',
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: <ChevronUp className="size-3" />, desc: <ChevronDown className="size-3" /> }[
                          header.column.getIsSorted() as string
                        ] ?? null}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-[13px] text-muted-foreground">
                  No archived tickets found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-[#f9fafb]">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-[13px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 text-[12px]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
