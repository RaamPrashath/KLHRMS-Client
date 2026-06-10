'use client';

import { ChangeEvent, ReactNode, useMemo, useState } from 'react';
import { ExportBand } from '@/modules/assets/components/ExportBand';
import { useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LaptopMinimal,
  PackageOpen,
  PackagePlus,
  RotateCcw,
  Search,
  User,
  User2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { fetchAssetDetailAction } from '@/modules/assets/api/assetServerActions';
import { readError } from '@/modules/assets/lib/assetUtils';
import { conditionBadge, formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import type { AssetIssueInput } from '@/modules/assets/schema/assetSchemas';
import type {
  AssetDetail,
  AssetLookupOption,
  AssetSummary,
  AvailableAssetGroup,
} from '@/modules/assets/types/assetTypes';

function IssuedAssetDetailDialog({
  asset,
  open,
  onOpenChange,
  orgSlug,
  memberId,
  onRevoke,
  isRevoking,
}: {
  asset: AssetDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  onRevoke: (assetId: string) => void;
  isRevoking: boolean;
}) {
  if (!asset) return null;

  const provision = asset.activeProvision;
  const isPendingReturn = provision?.handoverRequestedAt != null;
  const mutations = useAssetMutations(orgSlug, memberId);
  const [editDate, setEditDate] = useState(false);
  const [newDate, setNewDate] = useState('');

  const hasReplacement = !!provision?.replacementAssignmentId;
  const dueDate = provision?.returnDate ? new Date(provision.returnDate) : null;
  const today = new Date();
  const isOverdue = dueDate && dueDate < today;
  const isDueTomorrow = dueDate && Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) === 1;

  async function handleUpdateDate() {
    if (!newDate || !provision?.replacementAssignmentId) return;
    try {
      await mutations.updateReplacementReturnDate.mutateAsync({
        assignmentId: provision.replacementAssignmentId,
        expectedReturnDate: new Date(newDate).toISOString(),
      });
      toast.success('Return date updated');
      setEditDate(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to update date'));
    }
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-[#f3fbf5] text-[#156f3d]',
    ASSIGNED: 'bg-[#f4f8ff] text-[#2454a6]',
    IN_MAINTENANCE: 'bg-[#fff7e8] text-[#8a5a00]',
    PENDING_RETURN: 'bg-[#fff6db] text-[#8a5a00]',
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
            className="relative z-10 mx-4 w-full max-w-2xl rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Issued Asset Details</h2>
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
                    {provision?.memberName || asset.currentHolderName || 'Unknown'}
                  </p>
                  {provision?.memberEmail && (
                    <p className="text-[12px] text-[#6e6e73]">{provision.memberEmail}</p>
                  )}
                </div>
              </div>

              {/* Asset Details */}
              <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Asset Details
                </h3>
                <p className="text-[14px] font-semibold text-[#111827]">{asset.name}</p>
                <p className="mt-0.5 text-[11px] text-[#6e6e73]">{asset.assetCode}</p>
                {asset.serialNumber && (
                  <p className="mt-1 text-[11px] text-[#6e6e73]">S/N: {asset.serialNumber}</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#eef0f3] pt-3 text-[12px]">
                  <div>
                    <span className="text-[#86868b]">Category</span>
                    <p className="font-medium text-[#1d1d1f]">{humanize(asset.category)}</p>
                  </div>
                  <div>
                    <span className="text-[#86868b]">Condition</span>
                    <p className="font-medium text-[#1d1d1f]">{humanize(asset.condition)}</p>
                  </div>
                  {asset.model && (
                    <div>
                      <span className="text-[#86868b]">Model</span>
                      <p className="font-medium text-[#1d1d1f]">{asset.model}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[#86868b]">Status</span>
                    <span
                      className={cn(
                        'mt-0.5 inline-block rounded-md border-0 text-[10px] font-semibold px-2 py-0.5',
                        statusColors[asset.status] || 'bg-[#f3f4f6] text-[#6b7280]',
                      )}
                    >
                      {humanize(asset.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Info */}
              <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Assignment Info
                </h3>
                <div className="space-y-2">
                  {provision?.providedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Provided Date</span>
                      <span className="font-medium text-[#111827]">{formatDate(provision.providedDate)}</span>
                    </div>
                  )}
                  {provision?.providedByName && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Provided By</span>
                      <span className="font-medium text-[#111827]">{provision.providedByName}</span>
                    </div>
                  )}
                  {provision?.provideNotes && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#86868b]">Notes</span>
                      <span className="max-w-[250px] truncate text-right font-medium text-[#111827]">{provision.provideNotes}</span>
                    </div>
                  )}
                  {isPendingReturn && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#fff7e8] px-3 py-2">
                      <RotateCcw className="size-3.5 shrink-0 text-[#8a5a00]" />
                      <span className="text-[12px] font-medium text-[#8a5a00]">
                        Return requested — awaiting employee handover
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expected Return Date (only when replacement-linked) */}
              {hasReplacement && (
                <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
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
                            <span className="ml-2 text-[11px] font-medium text-red-500">Overdue</span>
                          )}
                          {isDueTomorrow && (
                            <span className="ml-2 text-[11px] font-medium text-[#d97706]">Due Tomorrow!</span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-[12px] text-[#9ca3af]">Not set</p>
                      )}
                    </div>
                    {provision.replacementAssignmentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDate(!editDate);
                          if (provision.returnDate) {
                            setNewDate(provision.returnDate.split('T')[0]);
                          }
                        }}
                        className="text-[12px] font-medium text-[#3862f6] hover:text-[#2563eb]"
                      >
                        {editDate ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isPendingReturn && (
                <div className="flex justify-end gap-3 border-t border-[#eef0f3] pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg px-4 py-2 text-[13px] font-medium"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onRevoke(asset.id)}
                    disabled={isRevoking}
                    className="rounded-lg bg-[#d97706] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#b45309] disabled:opacity-40"
                  >
                    {isRevoking ? (
                      <span className="flex items-center gap-2">
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Requesting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="size-3.5" />
                        Request Return
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function IssueAssetTab({
  members,
  availableGroups,
  canManageAssets,
  memberId,
  onIssue,
  isGroupsLoading,
  assignedAssets,
  orgSlug,
  headerAction,
}: {
  members: AssetLookupOption[];
  availableGroups: AvailableAssetGroup[];
  canManageAssets: boolean;
  memberId: string;
  onIssue: (data: AssetIssueInput) => Promise<void>;
  isGroupsLoading?: boolean;
  assignedAssets?: AssetSummary[];
  orgSlug: string;
  headerAction?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const mutations = useAssetMutations(orgSlug, memberId);

  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'asset', desc: false }]);
  const [assetSearch, setAssetSearch] = useState('');
  const [tableFilterEmployeeIds, setTableFilterEmployeeIds] = useState<string[]>([]);
  const [tableEmployeeSearch, setTableEmployeeSearch] = useState('');

  async function handleRowClick(asset: AssetSummary) {
    setIsDetailLoading(true);
    setDetailOpen(true);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['asset', orgSlug, asset.id],
        queryFn: () => fetchAssetDetailAction({ orgSlug, memberId, assetId: asset.id }),
        staleTime: 1000 * 60,
      });
      setSelectedAsset(detail);
    } catch (error) {
      toast.error(readError(error, 'Failed to load asset details'));
      setDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleRevoke(assetId: string) {
    try {
      const result = await mutations.requestReturn.mutateAsync(assetId);
      toast.success(result.message);
      setDetailOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      toast.error(readError(error, 'Failed to request return'));
    }
  }


  const tableFilteredMembers = useMemo(() => {
    if (!tableEmployeeSearch.trim()) return members;
    const q = tableEmployeeSearch.toLowerCase();
    return members.filter((m) => m.label.toLowerCase().includes(q));
  }, [members, tableEmployeeSearch]);

  const issuedAssets = useMemo(() => {
    let list = (assignedAssets ?? []).filter((a) => a.status === 'ASSIGNED');
    if (tableFilterEmployeeIds.length > 0) {
      const set = new Set(tableFilterEmployeeIds);
      list = list.filter((a) => a.currentHolderMemberId && set.has(a.currentHolderMemberId));
    }
    if (assetSearch.trim()) {
      const q = assetSearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          (a.currentHolderName ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [assignedAssets, assetSearch, tableFilterEmployeeIds]);

  function memberDisplayName(member: AssetLookupOption): string {
    const raw = (member.label || member.email || '').trim();
    if (raw.includes('@')) {
      const localPart = raw.split('@')[0] ?? raw;
      return localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return raw;
  }

function groupDisplayLabel(group: AvailableAssetGroup): string {
    const parts: string[] = [];
    if (group.categoryName) parts.push(group.categoryName);
    if (group.brand) parts.push(group.brand);
    parts.push(group.assetCode);
    return parts.join(' / ');
}

  const columns = useMemo(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        accessorKey: 'name',
        cell: ({ row: r }: { row: { original: AssetSummary } }) => {
          const a = r.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/10 text-muted-foreground">
                <LaptopMinimal className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{a.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{a.assetCode}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'employee',
        header: 'Assigned To',
        accessorKey: 'currentHolderName',
        cell: ({ getValue }: { getValue: () => string | null }) => {
          const name = getValue();
          return name ? (
            <span className="text-[13px] text-slate-700 dark:text-slate-350 font-medium">{name}</span>
          ) : (
            <span className="text-[13px] text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorKey: 'condition',
        cell: ({ getValue }: { getValue: () => string }) => {
          const val = getValue();
          return (
            <Badge
              className={cn(
                'rounded-md border-0 px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                conditionBadge(val as any),
              )}
            >
              {humanize(val)}
            </Badge>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: AssetSummary) => (row.openMaintenanceCount > 0 ? 'Has Tickets' : 'Active'),
        cell: ({ row: r }: { row: { original: AssetSummary } }) => {
          const a = r.original;
          const isPending = a.openMaintenanceCount > 0;
          return (
            <span className="flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full shrink-0', isPending ? 'bg-amber-500' : 'bg-emerald-500')} />
              <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">{isPending ? 'Has Tickets' : 'Active'}</span>
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: issuedAssets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 6 } },
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

  return (
    <div className="w-full space-y-4">
      {/* Issued Assets Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#111827]">Issued Assets</h2>
          {headerAction}
        </div>
        <Separator className="my-4" />
      </div>

      {/* Issued Assets Table Container */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Search Input + Export in Card Header */}
        <div className="px-8 py-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search assets..."
                value={assetSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetSearch(e.target.value)}
                className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 px-3 h-9 rounded-lg border text-xs font-medium transition-colors',
                    tableFilterEmployeeIds.length > 0
                      ? 'border-border bg-muted/30 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <ChevronsUpDown className="size-4" />
                  <span>
                    {tableFilterEmployeeIds.length > 0
                      ? `${tableFilterEmployeeIds.length} selected`
                      : 'All Employees'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search employees..."
                    value={tableEmployeeSearch}
                    onValueChange={setTableEmployeeSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No employees found.</CommandEmpty>
                    <CommandGroup>
                      {tableFilteredMembers.map((emp) => {
                        const isSelected = tableFilterEmployeeIds.includes(emp.id);
                        return (
                          <CommandItem
                            key={emp.id}
                            onSelect={() => {
                              setTableFilterEmployeeIds((prev) =>
                                prev.includes(emp.id)
                                  ? prev.filter((v) => v !== emp.id)
                                  : [...prev, emp.id],
                              );
                            }}
                          >
                            <div
                              className={cn(
                                'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                                isSelected
                                  ? 'border-[#111827] bg-[#111827] text-white'
                                  : 'border-[#d1d5db]',
                              )}
                            >
                              {isSelected && <Check className="size-3" />}
                            </div>
                            <span className="text-[13px]">{emp.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                  {tableFilterEmployeeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t border-[#e5e7eb] p-2">
                      {members.filter((m) => tableFilterEmployeeIds.includes(m.id)).slice(0, 3).map((emp) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11px] text-[#6b7280]"
                        >
                          {emp.label.split(' ')[0]}
                          <button
                            type="button"
                            onClick={() => {
                              setTableFilterEmployeeIds((prev) => prev.filter((v) => v !== emp.id));
                            }}
                            className="hover:text-[#111827]"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      {tableFilterEmployeeIds.length > 3 && (
                        <span className="text-[11px] text-[#9ca3af]">+{tableFilterEmployeeIds.length - 3} more</span>
                      )}
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
            {canManageAssets && (
              <ExportBand
                orgSlug={orgSlug}
                memberId={memberId}
                members={members}
                domain="issued"
                showEmployeeFilter={false}
              />
            )}
          </div>
        </div>

        {issuedAssets.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-center">
            <div>
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted/40 border border-border text-muted-foreground">
                <PackageOpen className="size-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-foreground">No assets issued</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Use the form above to assign assets to employees</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="h-11 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-wider"
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
                      className="group border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
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

            {issuedAssets.length > 0 && (
              <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
                <span className="font-semibold text-muted-foreground">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, issuedAssets.length)}
                  {' '}of {issuedAssets.length} entries
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
      </div>

      {/* Detail Dialog */}
      <IssuedAssetDetailDialog
        asset={selectedAsset}
        open={detailOpen && !isDetailLoading}
        onOpenChange={setDetailOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        onRevoke={handleRevoke}
        isRevoking={mutations.requestReturn.isPending}
      />
    </div>
  );
}
