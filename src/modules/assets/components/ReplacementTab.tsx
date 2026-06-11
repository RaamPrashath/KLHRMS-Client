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
import {
  AlertTriangle,
  ArrowLeftRight,
  Search,
  User2,
  Laptop,
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
import { useReplacementsQuery } from '@/modules/assets/hooks/useAssetsQuery';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { formatDate, humanize, readError } from '@/modules/assets/lib/assetUtils';
import type { ReplacementRecord } from '@/modules/assets/types/assetTypes';
import { toast } from 'sonner';
import { ExportBand } from '@/modules/assets/components/ExportBand';

function ReplacementDetailDialog({
  record,
  open,
  onOpenChange,
  orgSlug,
  memberId,
}: {
  record: ReplacementRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
}) {
  const mutations = useAssetMutations(orgSlug, memberId);
  const [editDate, setEditDate] = useState(false);
  const [newDate, setNewDate] = useState('');

  if (!record) return null;

  const isTemporary = record.replacementMode === 'TEMPORARY_BACKUP';
  const dueDate = record.expectedReturnDate
    ? new Date(record.expectedReturnDate)
    : null;
  const today = new Date();
  const isOverdue = dueDate && dueDate < today;
  const isDueTomorrow =
    dueDate &&
    Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) === 1;

  async function handleUpdateDate() {
    if (!newDate || !record) return;
    try {
      await mutations.updateReplacementReturnDate.mutateAsync({
        assignmentId: record.replacementAssignmentId!,
        expectedReturnDate: new Date(newDate).toISOString(),
      });
      toast.success('Return date updated');
      setEditDate(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to update date'));
    }
  }

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
            className="relative z-10 mx-4 w-full max-w-2xl rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Replacement Details</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Employee */}
              <div className="flex items-center gap-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                <div className="flex size-10 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white">
                  <User2 className="size-4 text-[#6b7280]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">
                    {record.employeeName || 'Unknown'}
                  </p>
                  {record.employeeEmail && (
                    <p className="text-[12px] text-[#6e6e73]">{record.employeeEmail}</p>
                  )}
                </div>
              </div>

              {/* Assets Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    Original Asset
                  </h3>
                  <p className="text-[14px] font-semibold text-[#111827]">{record.originalAssetName}</p>
                  <p className="text-[11px] text-[#6e6e73]">{record.originalAssetCode}</p>
                  {record.originalSerial && (
                    <p className="mt-1 text-[11px] text-[#6e6e73]">S/N: {record.originalSerial}</p>
                  )}
                  <Badge className="mt-2 rounded-md bg-[#fff7e8] text-[#8a5a00] text-[10px] font-medium border-0">
                    {humanize(record.originalUnitStatus || '')}
                  </Badge>
                </div>
                <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    Replacement Asset
                  </h3>
                  <p className="text-[14px] font-semibold text-[#111827]">{record.replacementAssetName}</p>
                  <p className="text-[11px] text-[#6e6e73]">{record.replacementAssetCode}</p>
                  {record.replacementSerial && (
                    <p className="mt-1 text-[11px] text-[#6e6e73]">S/N: {record.replacementSerial}</p>
                  )}
                  <Badge className="mt-2 rounded-md bg-[#f3fbf5] text-[#156f3d] text-[10px] font-medium border-0">
                    ASSIGNED
                  </Badge>
                </div>
              </div>

              {/* Mode */}
              <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                      Replacement Mode
                    </span>
                    <p className="mt-1 text-[14px] font-semibold text-[#111827]">
                      {isTemporary ? 'Temporary Backup' : 'Permanent Replacement'}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'rounded-md border-0 text-[11px] font-semibold',
                      isTemporary
                        ? 'bg-[#fffbeb] text-[#8a5a00]'
                        : 'bg-[#f3fbf5] text-[#156f3d]',
                    )}
                  >
                    {isTemporary ? 'Temporary' : 'Permanent'}
                  </Badge>
                </div>

                {isTemporary && (
                  <div className="mt-4 border-t border-[#eef0f3] pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                          Expected Return Date
                        </span>
                        {editDate ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="w-44 text-[13px]"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleUpdateDate}
                              className="rounded-lg text-[12px]"
                              disabled={mutations.updateReplacementReturnDate.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditDate(false)}
                              className="rounded-lg text-[12px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : dueDate ? (
                          <p className="mt-1 text-[14px] font-semibold text-[#111827]">
                            {dueDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {isOverdue && (
                              <span className="ml-2 text-[11px] font-medium text-red-500">
                                Overdue
                              </span>
                            )}
                            {isDueTomorrow && (
                              <span className="ml-2 text-[11px] font-medium text-[#d97706]">
                                Due Tomorrow!
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="mt-1 text-[12px] text-[#9ca3af]">Not set</p>
                        )}
                      </div>
                      {record.replacementAssignmentId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditDate(!editDate);
                            if (record.expectedReturnDate) {
                              setNewDate(record.expectedReturnDate.split('T')[0]);
                            }
                          }}
                          className="text-[12px] font-medium text-[#3862f6] hover:text-[#2563eb]"
                        >
                          {editDate ? 'Cancel' : 'Edit'}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-[#6e6e73]">
                      {record.returnReminderSent
                        ? 'Reminder sent'
                        : 'Reminder not yet sent'}
                    </p>
                  </div>
                )}
              </div>

              {/* Ticket Info */}
              {record.ticketId && (
                <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    Ticket Details
                  </h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Ticket</span>
                      <span className="font-medium text-[#111827]">{record.ticketId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Type</span>
                      <span className="font-medium text-[#111827]">
                        {humanize(record.maintenanceType || '')}
                      </span>
                    </div>
                    {record.issueDescription && (
                      <div className="flex justify-between">
                        <span className="text-[#86868b]">Issue</span>
                        <span className="max-w-[250px] truncate text-right font-medium text-[#111827]">
                          {record.issueDescription}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#86868b]">Status</span>
                      <Badge
                        className={cn(
                          'rounded-md border-0 text-[10px] font-semibold',
                          record.maintenanceStatus === 'COMPLETED'
                            ? 'bg-[#f3fbf5] text-[#156f3d]'
                            : 'bg-[#f4f8ff] text-[#2454a6]',
                        )}
                      >
                        {humanize(record.maintenanceStatus || '')}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Provided By */}
              <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Provided By
                </h3>
                <p className="text-[14px] font-medium text-[#111827]">
                  {record.providedByName || 'Unknown'}
                </p>
                <p className="mt-1 text-[11px] text-[#6e6e73]">
                  Swap completed: {formatDate(record.swapCompletedAt)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ReplacementTab({
  orgSlug,
  memberId,
  canManageAssets,
  members,
}: {
  orgSlug: string;
  memberId: string;
  canManageAssets: boolean;
  members: { id: string; label: string }[];
}) {
  const { data, isLoading, isError } = useReplacementsQuery(orgSlug, memberId);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employee', desc: false }]);
  const [selectedRecord, setSelectedRecord] = useState<ReplacementRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        r.originalAssetName.toLowerCase().includes(q) ||
        r.replacementAssetName.toLowerCase().includes(q) ||
        (r.ticketId ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns = useMemo(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        accessorKey: 'employeeName',
        cell: ({ row: r }: { row: { original: ReplacementRecord } }) => {
          const rec = r.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white">
                <User2 className="size-3.5 text-[#6b7280]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#111827] truncate">
                  {rec.employeeName || 'Unknown'}
                </p>
                {rec.employeeEmail && (
                  <p className="text-[10px] text-[#6e6e73] truncate">{rec.employeeEmail}</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'original',
        header: 'Original Asset',
        accessorKey: 'originalAssetName',
        cell: ({ row: r }: { row: { original: ReplacementRecord } }) => {
          const rec = r.original;
          return (
            <div>
              <p className="text-[13px] font-medium text-[#111827]">{rec.originalAssetName}</p>
              <p className="text-[10px] text-[#6e6e73]">{rec.originalAssetCode}</p>
            </div>
          );
        },
      },
      {
        id: 'replacement',
        header: 'Replacement',
        accessorKey: 'replacementAssetName',
        cell: ({ row: r }: { row: { original: ReplacementRecord } }) => {
          const rec = r.original;
          return (
            <div>
              <p className="text-[13px] font-medium text-[#111827]">{rec.replacementAssetName}</p>
              <p className="text-[10px] text-[#6e6e73]">{rec.replacementAssetCode}</p>
            </div>
          );
        },
      },
      {
        id: 'ticketId',
        header: 'Ticket',
        accessorKey: 'ticketId',
        cell: ({ getValue }: { getValue: () => string | null }) => (
          <span className="text-[13px] font-medium text-[#3862f6]">
            {getValue() || '—'}
          </span>
        ),
      },
      {
        id: 'providedByName',
        header: 'Provided By',
        accessorKey: 'providedByName',
        cell: ({ getValue }: { getValue: () => string | null }) => (
          <span className="text-[13px] text-[#374151]">{getValue() || '—'}</span>
        ),
      },
      {
        id: 'mode',
        header: 'Mode',
        accessorKey: 'replacementMode',
        cell: ({ row: r }: { row: { original: ReplacementRecord } }) => {
          const isTemp = r.original.replacementMode === 'TEMPORARY_BACKUP';
          return (
            <Badge
              className={cn(
                'rounded-md border-0 text-[10px] font-semibold',
                isTemp
                  ? 'bg-[#fffbeb] text-[#8a5a00]'
                  : 'bg-[#f3fbf5] text-[#156f3d]',
              )}
            >
              {isTemp ? 'Temporary' : 'Permanent'}
            </Badge>
          );
        },
      },
      {
        id: 'expectedReturnDate',
        header: 'Return Date',
        accessorKey: 'expectedReturnDate',
        cell: ({ row: r }: { row: { original: ReplacementRecord } }) => {
          const rec = r.original;
          if (rec.replacementMode !== 'TEMPORARY_BACKUP' || !rec.expectedReturnDate) {
            return <span className="text-[13px] text-[#9ca3af]">—</span>;
          }
          const dueDate = new Date(rec.expectedReturnDate);
          const today = new Date();
          const isOverdue = dueDate < today;
          const isDueTomorrow =
            Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) === 1;
          return (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#374151]">
                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {isOverdue && (
                <Badge className="rounded-md border-0 bg-red-50 text-[10px] font-semibold text-red-600">
                  Overdue
                </Badge>
              )}
              {isDueTomorrow && (
                <Badge className="rounded-md border-0 bg-amber-50 text-[10px] font-semibold text-amber-600">
                  Due Tomorrow!
                </Badge>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  function handleRowClick(record: ReplacementRecord) {
    setSelectedRecord(record);
    setDetailOpen(true);
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
            <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load replacement records</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Try refreshing the page</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
          <div>
            <ArrowLeftRight className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[14px] font-semibold text-foreground">No replacement records found</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Replacement records will appear here</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="px-8 py-6 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by employee, asset, or ticket..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    table.setPageIndex(0);
                  }}
                  className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
                />
              </div>
              {canManageAssets && (
                <ExportBand
                  orgSlug={orgSlug}
                  memberId={memberId}
                  members={members}
                  domain="returned"
                  showEmployeeFilter={false}
                />
              )}
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

          {filtered.length > 0 && (
            <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
              <span className="font-semibold text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filtered.length)}
                {' '}of {filtered.length} entries
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

      <ReplacementDetailDialog
        record={selectedRecord}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orgSlug={orgSlug}
        memberId={memberId}
      />
    </div>
  );
}
