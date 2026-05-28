'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Hammer,
  RotateCcw,
  User2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fetchReturnedAssetsAction } from '@/modules/assets/api/assetServerActions';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { ReturnedAssetItem } from '@/modules/assets/components/dashboard/dashboard.types';

function ReturnedAssetDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ReturnedAssetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-[#fff7e8] text-[#8a5a00]',
      IN_PROGRESS: 'bg-[#f4f8ff] text-[#2454a6]',
      COMPLETED: 'bg-[#f3fbf5] text-[#156f3d]',
      CANCELLED: 'bg-[#f3f4f6] text-[#6b7280]',
    };
    return colors[status] || colors.OPEN;
  };

  const conditionBadge = (condition: string | null) => {
    const colors: Record<string, string> = {
      NEW: 'bg-[#f3fbf5] text-[#156f3d]',
      GOOD: 'bg-[#f4f8ff] text-[#2454a6]',
      FAIR: 'bg-[#fff7e8] text-[#8a5a00]',
      DAMAGED: 'bg-[#fff3f2] text-[#b3261e]',
      NEEDS_REPAIR: 'bg-[#fff3f2] text-[#b3261e]',
    };
    return colors[condition ?? ''] || 'bg-[#f3f4f6] text-[#6b7280]';
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 mx-4 w-full max-w-xl rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Returned Asset Details</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Asset Details Section */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Asset Details
                </h3>
                <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-[#111827]">{item.assetName}</p>
                      <p className="mt-0.5 text-[12px] text-[#6e6e73]">{item.assetCode}</p>
                    </div>
                    <Badge className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium border-0', conditionBadge(item.returnedCondition))}>
                      {humanize(item.returnedCondition ?? 'Unknown')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#86868b]">Category</span>
                      <p className="font-medium text-[#1d1d1f]">{humanize(item.category)}</p>
                    </div>
                    {item.serialNumber && (
                      <div>
                        <span className="text-[#86868b]">Serial</span>
                        <p className="font-medium text-[#1d1d1f]">{item.serialNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[#86868b]">Employee</span>
                      <p className="font-medium text-[#1d1d1f]">{item.employeeName || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Email</span>
                      <p className="truncate font-medium text-[#1d1d1f]">{item.employeeEmail || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-[#eef0f3] pt-3 text-[12px]">
                    <div>
                      <span className="text-[#86868b]">Provided Date</span>
                      <p className="font-medium text-[#1d1d1f]">{formatDate(item.providedDate)}</p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Return Date</span>
                      <p className="font-medium text-[#1d1d1f]">{formatDate(item.returnDate)}</p>
                    </div>
                  </div>
                  {item.returnNotes && (
                    <div className="border-t border-[#eef0f3] pt-3 text-[12px]">
                      <span className="text-[#86868b]">Return Notes</span>
                      <p className="mt-0.5 text-[13px] text-[#1d1d1f]">{item.returnNotes}</p>
                    </div>
                  )}
                  {item.isTemporaryReplacement && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#fff7e8] px-3 py-2">
                      <RotateCcw className="size-3.5 text-[#8a5a00]" />
                      <span className="text-[12px] font-medium text-[#8a5a00]">Temporary Replacement</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Details Section */}
              {item.hasTicket && (
                <div>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    Ticket Details
                  </h3>
                  <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hammer className="size-4 text-[#d97706]" />
                        <span className="text-[13px] font-semibold text-[#111827]">
                          {item.ticketId}
                        </span>
                      </div>
                      <Badge className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium border-0', statusBadge(item.maintenanceStatus ?? ''))}>
                        {humanize(item.maintenanceStatus ?? 'Unknown')}
                      </Badge>
                    </div>
                    {item.maintenanceType && (
                      <div className="text-[12px]">
                        <span className="text-[#86868b]">Type</span>
                        <p className="font-medium text-[#1d1d1f]">{humanize(item.maintenanceType)}</p>
                      </div>
                    )}
                    {item.issueDescription && (
                      <div className="border-t border-[#eef0f3] pt-3 text-[12px]">
                        <span className="text-[#86868b]">Issue</span>
                        <p className="mt-0.5 text-[13px] text-[#1d1d1f]">{item.issueDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ReturnedAssetsTab({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['returned-assets', orgSlug],
    queryFn: () => fetchReturnedAssetsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });

  const [sorting, setSorting] = useState<SortingState>([{ id: 'returnDate', desc: true }]);
  const [selectedItem, setSelectedItem] = useState<ReturnedAssetItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const items = data ?? [];

  const columns = useMemo(
    () => [
      {
        id: 'assetName',
        header: 'Asset',
        accessorFn: (row: ReturnedAssetItem) => row.assetName,
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa]">
                <ArrowLeftRight className="size-3.5 text-[#6b7280]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{item.assetName}</p>
                <p className="truncate text-[11px] text-[#6e6e73]">{item.assetCode}</p>
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'employeeName',
        header: 'Employee',
        accessorFn: (row: ReturnedAssetItem) => row.employeeName ?? '',
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          return (
            <div className="flex items-center gap-2">
              <User2 className="size-3.5 shrink-0 text-[#6e6e73]" />
              <span className="text-[13px] text-[#6e6e73]">{item.employeeName || '—'}</span>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'returnedCondition',
        header: 'Condition',
        accessorFn: (row: ReturnedAssetItem) => row.returnedCondition ?? '',
        cell: ({ getValue }: { getValue: () => string }) => {
          const val = getValue();
          const colors: Record<string, string> = {
            NEW: 'bg-[#f3fbf5] text-[#156f3d]',
            GOOD: 'bg-[#f4f8ff] text-[#2454a6]',
            FAIR: 'bg-[#fff7e8] text-[#8a5a00]',
            DAMAGED: 'bg-[#fff3f2] text-[#b3261e]',
            NEEDS_REPAIR: 'bg-[#fff3f2] text-[#b3261e]',
          };
          return (
            <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', colors[val] || 'bg-[#f3f4f6] text-[#6b7280]')}>
              {humanize(val || 'Unknown')}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: 'returnDate',
        header: 'Return Date',
        accessorFn: (row: ReturnedAssetItem) => row.returnDate,
        cell: ({ getValue }: { getValue: () => string }) => (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 text-[#6e6e73]" />
            <span className="text-[13px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'ticketStatus',
        header: 'Ticket',
        accessorFn: (row: ReturnedAssetItem) => (row.hasTicket ? row.maintenanceStatus ?? '' : ''),
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          if (!item.hasTicket) return <span className="text-[12px] text-[#9ca3af]">None</span>;
          const colors: Record<string, string> = {
            OPEN: 'bg-[#fff7e8] text-[#8a5a00]',
            IN_PROGRESS: 'bg-[#f4f8ff] text-[#2454a6]',
            COMPLETED: 'bg-[#f3fbf5] text-[#156f3d]',
            CANCELLED: 'bg-[#f3f4f6] text-[#6b7280]',
          };
          return (
            <div className="flex items-center gap-2">
              <Hammer className="size-3.5 text-[#6e6e73]" />
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', colors[item.maintenanceStatus ?? ''] || 'bg-[#f3f4f6] text-[#6b7280]')}>
                {humanize(item.maintenanceStatus ?? 'Unknown')}
              </span>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'isTemporaryReplacement',
        header: 'Type',
        accessorFn: (row: ReturnedAssetItem) => (row.isTemporaryReplacement ? 'Temporary' : 'Standard'),
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          if (!item.isTemporaryReplacement) return <span className="text-[12px] text-[#9ca3af]">Standard</span>;
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e8] px-2.5 py-0.5 text-[10px] font-medium text-[#8a5a00]">
              <RotateCcw className="size-3" />
              Temporary
            </span>
          );
        },
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  function handleRowClick(item: ReturnedAssetItem) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold text-[#111827]">Returned Assets</h2>
        <p className="mt-0.5 text-[13px] text-[#6b7280]">
          Monitor returned assets, track conditions, and review related maintenance tickets
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
          <div>
            <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
            <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load returned assets</p>
            <p className="mt-0.5 text-[13px] text-[#6e6e73]">Try refreshing the page</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
          <div>
            <ArrowLeftRight className="mx-auto size-6 text-[#9ca3af]" />
            <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">No returned assets yet</p>
            <p className="mt-0.5 text-[13px] text-[#6e6e73]">Returned assets will appear here</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      return (
                        <TableHead
                          key={header.id}
                          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              className={`flex items-center gap-1 ${canSort ? 'cursor-pointer select-none' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && (
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
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-b border-[#f0f0f2] transition-colors hover:bg-[#fafafa]"
                    onClick={() => handleRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
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
              <span className="text-[12px] text-[#86868b] tabular-nums">
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
        </div>
      )}

      <ReturnedAssetDetailDialog
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
