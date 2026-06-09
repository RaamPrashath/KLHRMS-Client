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
  RotateCw,
  User2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { conditionBadge, formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { ReturnedAssetItem } from '@/modules/assets/components/dashboard/dashboard.types';
import { ReplacementTab } from '@/modules/assets/components/ReplacementTab';
import { Search } from 'lucide-react';

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
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{item.assetName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.assetCode}</p>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'employeeName',
        header: 'Assigned To',
        accessorFn: (row: ReturnedAssetItem) => row.employeeName ?? '',
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          return (
            <div className="flex items-center gap-2">
              <User2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[13px] text-slate-700 dark:text-slate-350 font-medium">{item.employeeName || '—'}</span>
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
          return (
            <Badge
              className={cn(
                'rounded-md border-0 px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                conditionBadge(val as any),
              )}
            >
              {humanize(val || 'Unknown')}
            </Badge>
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
            <CalendarClock className="size-3.5 text-muted-foreground" />
            <span className="text-[13px] tabular-nums text-slate-755 dark:text-slate-300 font-medium">{formatDate(getValue())}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'ticketStatus',
        header: 'Status',
        accessorFn: (row: ReturnedAssetItem) => (row.hasTicket ? row.maintenanceStatus ?? '' : ''),
        cell: ({ row: tableRow }: { row: { original: ReturnedAssetItem } }) => {
          const item = tableRow.original;
          if (!item.hasTicket) return <span className="text-[12px] text-muted-foreground/60 block text-left">None</span>;
          const colors: Record<string, string> = {
            OPEN: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20',
            IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
            COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20',
            CANCELLED: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-500/20',
          };
          return (
            <div className="flex items-center gap-2">
              <Hammer className="size-3.5 text-muted-foreground" />
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', colors[item.maintenanceStatus ?? ''] || 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400')}>
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
          if (!item.isTemporaryReplacement) return <span className="text-[12px] text-muted-foreground/60 block text-left">Standard</span>;
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-2.5 py-0.5 text-[10px] font-medium">
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

  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    let result = items;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.assetName.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          (a.employeeName ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

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

  function handleRowClick(item: ReturnedAssetItem) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  const [subTab, setSubTab] = useState<'returned' | 'replacement'>('returned');

  return (
    <div>
      <div className="mb-4 overflow-x-auto">
        <div className="inline-flex min-w-fit items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => setSubTab('returned')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
              subTab === 'returned'
                ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            <RotateCw className="size-3.5" />
            Returned Assets
          </button>
          <button
            type="button"
            onClick={() => setSubTab('replacement')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
              subTab === 'replacement'
                ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            <ArrowLeftRight className="size-3.5" />
            Replacement
          </button>
        </div>
      </div>

      {subTab === 'returned' ? (
        <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60 border border-border" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
              <div>
                <AlertTriangle className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load returned assets</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Try refreshing the page</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
              <div>
                <ArrowLeftRight className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-[14px] font-semibold text-foreground">No returned assets yet</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Returned assets will appear here</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="px-8 py-6 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search assets..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        table.setPageIndex(0);
                      }}
                      className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                        {hg.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="h-11 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredItems.length > 0 && (
                <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
                  <span className="font-semibold text-muted-foreground">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                    {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredItems.length)}
                    {' '}of {filteredItems.length} entries
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
            </div>
          )}

          <ReturnedAssetDetailDialog
            item={selectedItem}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        </div>
      ) : (
        <ReplacementTab orgSlug={orgSlug} memberId={memberId} />
      )}
    </div>
  );
}
