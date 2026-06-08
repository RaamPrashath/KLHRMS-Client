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
import { EmployeePagination } from '@/modules/employees/components/EmployeePagination';
import { cn } from '@/lib/utils';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

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

const COLUMNS = [
  {
    id: 'ticketId',
    header: 'Ticket',
    accessorFn: (row: MaintenanceTicket) => row.ticketId,
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="text-[12px] font-semibold tabular-nums text-[#1d1d1f]">{getValue()}</span>
    ),
    enableSorting: true,
  },
  {
    id: 'assetName',
    header: 'Asset',
    accessorFn: (row: MaintenanceTicket) => row.assetName ?? '—',
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="block max-w-40 truncate text-[13px] font-medium text-[#1d1d1f]" title={getValue()}>{getValue()}</span>
    ),
  },
  {
    id: 'assetCode',
    header: 'Code',
    accessorFn: (row: MaintenanceTicket) => row.assetCode ?? '—',
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="text-[12px] text-[#6e6e73]">{getValue()}</span>
    ),
  },
  {
    id: 'maintenanceType',
    header: 'Type',
    accessorFn: (row: MaintenanceTicket) => row.maintenanceType,
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="inline-flex items-center rounded-full bg-[#f0f4f8] px-2.5 py-0.5 text-[11px] font-medium text-[#5b6470]">
        {humanize(getValue())}
      </span>
    ),
  },
  {
    id: 'issueDescription',
    header: 'Issue',
    accessorFn: (row: MaintenanceTicket) => row.issueDescription,
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="block max-w-64 truncate text-[13px] text-[#6e6e73]" title={getValue()}>
        {getValue()}
      </span>
    ),
  },
  {
    id: 'priority',
    header: 'Priority',
    accessorFn: (row: MaintenanceTicket) => resolvePriority(row),
    cell: ({ getValue }: { getValue: () => string }) => {
      const s = priorityStyle[getValue()] || priorityStyle.low;
      return (
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: s.dot }} />
          <span className="text-[12px] font-medium text-[#1d1d1f]">{s.label}</span>
        </div>
      );
    },
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (row: MaintenanceTicket) => row.status,
    cell: ({ getValue }: { getValue: () => string }) => {
      const s = statusStyle[getValue()] || statusStyle.OPEN;
      return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', s.bg, s.text)}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
          {s.label}
        </span>
      );
    },
  },
  {
    id: 'assetLifecycle',
    header: 'Asset State',
    accessorFn: (row: MaintenanceTicket) => row.assetLifecycleStatusLabel ?? '—',
    cell: ({ row, getValue }: { row: { original: MaintenanceTicket }; getValue: () => string }) => {
      const tone = lifecycleStyle[row.original.assetLifecycleStatus ?? ''] ?? { bg: 'bg-neutral-100', text: 'text-neutral-600' };
      return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', tone.bg, tone.text)}>
          {getValue()}
        </span>
      );
    },
  },
  {
    id: 'createdAt',
    header: 'Date',
    accessorFn: (row: MaintenanceTicket) => row.createdAt,
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="whitespace-nowrap text-[12px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
    ),
    enableSorting: true,
  },
  {
    id: 'loggedByName',
    header: 'Reported By',
    accessorFn: (row: MaintenanceTicket) => row.loggedByName ?? '—',
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="block max-w-32 truncate text-[12px] text-[#6e6e73]" title={getValue()}>{getValue()}</span>
    ),
  },
];

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
          </div>
        )}
      </FloatingPanelBody>
    </FloatingPanelContent>
  );
}

function TableInner({
  tickets,
  className,
}: {
  tickets: MaintenanceTicket[];
  className?: string;
}) {
  const { openFloatingPanel, setTitle } = useFloatingPanel();
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });

  const data = useMemo(() => tickets, [tickets]);

  const table = useReactTable({
    data,
    columns: COLUMNS,
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

  return (
    <>
      <div className={cn('rounded-xl border border-[#e5e7eb] bg-white', className)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="flex items-center gap-1 cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="flex flex-col">
                            <ChevronUp className={cn('size-3 -mb-1', header.column.getIsSorted() === 'asc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]')} />
                            <ChevronDown className={cn('size-3', header.column.getIsSorted() === 'desc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]')} />
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
                <TableCell colSpan={COLUMNS.length} className="py-12 text-center text-[13px] text-[#6e6e73]">
                  No matching tickets
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b border-[#f0f0f2] transition-colors hover:bg-[#f9fafb]"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 0 && (
        <div className="mt-3">
          <EmployeePagination
            page={table.getState().pagination.pageIndex + 1}
            totalPages={table.getPageCount()}
            total={table.getPrePaginationRowModel().rows.length}
            pageSize={table.getState().pagination.pageSize}
            onPageChange={(p) => table.setPageIndex(p - 1)}
            onPageSizeChange={(size) => table.setPageSize(size)}
          />
        </div>
      )}

      {selectedTicket && <TicketDetailPanel ticket={selectedTicket} />}
    </>
  );
}

export function MaintenanceTableView({
  tickets,
  className,
}: {
  tickets: MaintenanceTicket[];
  className?: string;
}) {
  const data = useMemo(() => tickets, [tickets]);

  if (!data.length) {
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
      <TableInner tickets={data} />
    </FloatingPanelRoot>
  );
}
