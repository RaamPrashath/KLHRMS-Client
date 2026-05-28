'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Hammer, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { useMyTicketsQuery, type MyTicket } from '@/modules/assets/hooks/useMyTicketsQuery';

const statusStyle: Record<string, { dot: string; label: string }> = {
  OPEN: { dot: '#dc2626', label: 'Open' },
  IN_PROGRESS: { dot: '#d97706', label: 'In Progress' },
  COMPLETED: { dot: '#00874a', label: 'Completed' },
  CANCELLED: { dot: '#6b7280', label: 'Cancelled' },
};

function MyTicketsTable({
  tickets,
  onWithdraw,
  withdrawingTicketId,
}: {
  tickets: MyTicket[];
  onWithdraw: (ticket: MyTicket) => Promise<void>;
  withdrawingTicketId: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [ticketToWithdraw, setTicketToWithdraw] = useState<MyTicket | null>(null);
  const canWithdraw = (ticket: MyTicket) =>
    ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED';

  const columns = useMemo(
    () => [
      {
        id: 'ticketId',
        header: 'Ticket ID',
        accessorFn: (row: MyTicket) => row.ticketId,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[12px] font-semibold tabular-nums text-[#1d1d1f]">{getValue()}</span>
        ),
      },
      {
        id: 'assetName',
        header: 'Asset',
        accessorFn: (row: MyTicket) => row.assetName,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-medium text-[#1d1d1f]">{getValue()}</span>
        ),
      },
      {
        id: 'assetCode',
        header: 'Code',
        accessorFn: (row: MyTicket) => row.assetCode,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[12px] text-[#6e6e73]">{getValue()}</span>
        ),
      },
      {
        id: 'maintenanceType',
        header: 'Type',
        accessorFn: (row: MyTicket) => row.maintenanceType,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="inline-flex items-center rounded-full bg-[#f0f4f8] px-2.5 py-0.5 text-[11px] font-medium text-[#5b6470]">
            {humanize(getValue())}
          </span>
        ),
      },
      {
        id: 'issueDescription',
        header: 'Issue',
        accessorFn: (row: MyTicket) => row.issueDescription,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="block max-w-56 truncate text-[13px] text-[#6e6e73]" title={getValue()}>
            {getValue()}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: MyTicket) => row.status,
        cell: ({ getValue }: { getValue: () => string }) => {
          const s = statusStyle[getValue()] || statusStyle.OPEN;
          return (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.dot }} />
              <span className="text-[13px] text-[#1d1d1f]">{s.label}</span>
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        header: 'Date',
        accessorFn: (row: MyTicket) => row.createdAt,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }: { row: { original: MyTicket } }) => {
          const ticket = row.original;
          const disabled = !canWithdraw(ticket) || withdrawingTicketId === ticket.id;

          return (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-[#9ca3af] hover:bg-[#fef2f2] hover:text-[#dc2626] disabled:opacity-40"
                disabled={disabled}
                onClick={() => setTicketToWithdraw(ticket)}
                aria-label={`Withdraw ticket ${ticket.ticketId}`}
                title={canWithdraw(ticket) ? 'Withdraw ticket' : 'Ticket cannot be withdrawn'}
              >
                {withdrawingTicketId === ticket.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [withdrawingTicketId],
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 7 } },
  });

  if (!tickets.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f9fafb]">
          <Hammer className="size-5 text-[#9ca3af]" />
        </div>
        <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">No tickets raised</p>
        <p className="mt-0.5 text-[13px] text-[#6e6e73]">Issues you report will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
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
                            <ChevronUp
                              className={`size-3 -mb-1 ${
                                header.column.getIsSorted() === 'asc'
                                  ? 'text-[#1d1d1f]'
                                  : 'text-[#d2d2d7]'
                              }`}
                            />
                            <ChevronDown
                              className={`size-3 ${
                                header.column.getIsSorted() === 'desc'
                                  ? 'text-[#1d1d1f]'
                                  : 'text-[#d2d2d7]'
                              }`}
                            />
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b border-[#f0f0f2]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f2] px-0 pt-3">
          <span className="text-[12px] text-neutral-400 tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 rounded-lg border-[#e5e7eb] px-2.5 text-[12px] font-normal"
            >
              Prev
            </Button>
            {Array.from({ length: table.getPageCount() }).map((_, i) => (
              <Button
                key={i}
                variant={table.getState().pagination.pageIndex === i ? 'default' : 'outline'}
                size="sm"
                onClick={() => table.setPageIndex(i)}
                className={`h-7 min-w-7 rounded-lg px-1 text-[12px] ${
                  table.getState().pagination.pageIndex === i
                    ? 'bg-[#1d1d1f] text-white'
                    : 'border-[#e5e7eb] text-[#6e6e73]'
                }`}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 rounded-lg border-[#e5e7eb] px-2.5 text-[12px] font-normal"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!ticketToWithdraw}
        onOpenChange={(open) => {
          if (!open) setTicketToWithdraw(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              {ticketToWithdraw
                ? `This will withdraw ${ticketToWithdraw.ticketId} from your raised tickets.`
                : 'This will withdraw the selected ticket.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!withdrawingTicketId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!ticketToWithdraw || !!withdrawingTicketId}
              onClick={async (event) => {
                event.preventDefault();
                if (!ticketToWithdraw) return;
                await onWithdraw(ticketToWithdraw);
                setTicketToWithdraw(null);
              }}
            >
              {withdrawingTicketId ? 'Withdrawing...' : 'Withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MyTicketsTab({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const { data, isLoading } = useMyTicketsQuery(orgSlug, memberId);
  const mutations = useAssetMutations(orgSlug, memberId);

  async function handleWithdraw(ticket: MyTicket) {
    try {
      await mutations.withdrawMyTicket.mutateAsync(ticket.id);
      toast.success(`Ticket ${ticket.ticketId} withdrawn`);
    } catch (error) {
      const message =
        error instanceof Error
          ? (() => {
              try {
                const parsed = JSON.parse(error.message) as { message?: string };
                return parsed.message ?? 'Failed to withdraw ticket';
              } catch {
                return error.message;
              }
            })()
          : 'Failed to withdraw ticket';
      toast.error(message);
      throw error;
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-32 animate-pulse rounded bg-[#f3f4f6]" />
              <div className="h-5 w-20 animate-pulse rounded bg-[#f3f4f6]" />
              <div className="h-5 w-16 animate-pulse rounded bg-[#f3f4f6]" />
              <div className="h-5 flex-1 animate-pulse rounded bg-[#f3f4f6]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <MyTicketsTable
      tickets={data ?? []}
      onWithdraw={handleWithdraw}
      withdrawingTicketId={mutations.withdrawMyTicket.isPending ? mutations.withdrawMyTicket.variables ?? null : null}
    />
  );
}
