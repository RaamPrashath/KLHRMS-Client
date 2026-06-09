'use client';

import { ChangeEvent, ReactNode, useMemo, useState } from 'react';
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
            className="relative z-10 mx-4 w-full max-w-lg rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Issued Asset Details</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Asset Details */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Asset Details
                </h3>
                <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-[#111827]">{asset.name}</p>
                      <p className="mt-0.5 text-[12px] text-[#6e6e73]">{asset.assetCode}</p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                        statusColors[asset.status] || 'bg-[#f3f4f6] text-[#6b7280]',
                      )}
                    >
                      {humanize(asset.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#86868b]">Category</span>
                      <p className="font-medium text-[#1d1d1f]">{humanize(asset.category)}</p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Condition</span>
                      <p className="font-medium text-[#1d1d1f]">{humanize(asset.condition)}</p>
                    </div>
                    {asset.serialNumber && (
                      <div>
                        <span className="text-[#86868b]">Serial</span>
                        <p className="font-medium text-[#1d1d1f]">{asset.serialNumber}</p>
                      </div>
                    )}
                    {asset.model && (
                      <div>
                        <span className="text-[#86868b]">Model</span>
                        <p className="font-medium text-[#1d1d1f]">{asset.model}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Details */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Assignment Details
                </h3>
                <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white">
                      <User2 className="size-4 text-[#6b7280]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#111827]">
                        {provision?.memberName || asset.currentHolderName || 'Unknown'}
                      </p>
                      {provision?.memberEmail && (
                        <p className="truncate text-[11px] text-[#6e6e73]">{provision.memberEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-[#eef0f3] pt-3 text-[12px]">
                    {provision?.providedDate && (
                      <div>
                        <span className="flex items-center gap-1 text-[#86868b]">
                          <CalendarClock className="size-3" />
                          Provided Date
                        </span>
                        <p className="font-medium text-[#1d1d1f]">{formatDate(provision.providedDate)}</p>
                      </div>
                    )}
                    {provision?.providedByName && (
                      <div>
                        <span className="flex items-center gap-1 text-[#86868b]">
                          <User className="size-3" />
                          Provided By
                        </span>
                        <p className="font-medium text-[#1d1d1f]">{provision.providedByName}</p>
                      </div>
                    )}
                  </div>

                  {provision?.provideNotes && (
                    <div className="border-t border-[#eef0f3] pt-3 text-[12px]">
                      <span className="text-[#86868b]">Notes</span>
                      <p className="mt-0.5 text-[13px] text-[#1d1d1f]">{provision.provideNotes}</p>
                    </div>
                  )}

                  {isPendingReturn && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#fff7e8] px-3 py-2">
                      <RotateCcw className="size-3.5 text-[#8a5a00]" />
                      <span className="text-[12px] font-medium text-[#8a5a00]">
                        Return requested — awaiting employee handover
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Revoke Button */}
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

  const [groupQuery, setGroupQuery] = useState('');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedEmployeeMemberId, setSelectedEmployeeMemberId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AvailableAssetGroup | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'asset', desc: false }]);
  const [assetSearch, setAssetSearch] = useState('');

  const selectedEmployee = useMemo(
    () => members.find((m) => m.id === selectedEmployeeMemberId) ?? null,
    [members, selectedEmployeeMemberId],
  );

  const filteredGroups = useMemo(
    () => {
      const q = groupQuery.toLowerCase().trim();
      const selectedLabel = selectedGroup ? groupDisplayLabel(selectedGroup).toLowerCase().trim() : '';
      
      // If query is empty or matches the currently selected group, show all options
      if (!q || q === selectedLabel) return availableGroups;
      
      return availableGroups.filter(
        (g) =>
          g.assetName.toLowerCase().includes(q) ||
          g.assetCode.toLowerCase().includes(q) ||
          (g.categoryName ?? '').toLowerCase().includes(q) ||
          (g.model ?? '').toLowerCase().includes(q),
      );
    },
    [availableGroups, groupQuery, selectedGroup],
  );

  const filteredEmployees = useMemo(
    () => {
      const q = employeeQuery.toLowerCase().trim();
      const selectedName = selectedEmployee ? memberDisplayName(selectedEmployee).toLowerCase().trim() : '';
      
      // If query is empty or matches the currently selected employee, show all options
      if (!q || q === selectedName) return members;
      
      return members.filter(
        (m) =>
          memberDisplayName(m).toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q),
      );
    },
    [members, employeeQuery, selectedEmployee],
  );

  function handleGroupSelect(label: string) {
    const group = availableGroups.find((g) => groupDisplayLabel(g) === label);
    setSelectedGroup(group ?? null);
    if (group) {
      setGroupQuery(groupDisplayLabel(group));
    } else {
      setGroupQuery('');
    }
  }

  function handleEmployeeSelect(label: string) {
    const member = members.find((m) => memberDisplayName(m) === label);
    setSelectedEmployeeMemberId(member?.id ?? null);
    if (member) {
      setEmployeeQuery(memberDisplayName(member));
    } else {
      setEmployeeQuery('');
    }
  }

  function handleReset() {
    setSelectedEmployeeMemberId(null);
    setSelectedGroup(null);
    setGroupQuery('');
    setEmployeeQuery('');
  }

  async function handleIssue() {
    if (!selectedEmployeeMemberId || !selectedGroup) return;
    setIsIssuing(true);
    try {
      await onIssue({
        memberId: selectedEmployeeMemberId,
        groupKey: selectedGroup.groupKey,
        quantity: 1,
        conditionWhileProviding: 'GOOD',
        providedByMemberId: memberId,
        notes: '',
      });
      toast.success('Asset issued successfully');
      handleReset();
    } catch (error) {
      toast.error(readError(error, 'Failed to issue asset'));
    } finally {
      setIsIssuing(false);
    }
  }

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

  const isSelfAssigned = selectedEmployeeMemberId === memberId;
  const issuedAssets = useMemo(() => {
    let list = (assignedAssets ?? []).filter((a) => a.status === 'ASSIGNED');
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
  }, [assignedAssets, assetSearch]);

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
    <div className="w-full space-y-8">
      {/* Issue Asset Form */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#111827]">Issue Asset</h2>
          {headerAction}
        </div>
        <Separator className="my-4" />

        <div className="space-y-6 max-w-3xl">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Employee</Label>
              <Combobox
                open={isEmployeeOpen}
                onOpenChange={(open) => {
                  setIsEmployeeOpen(open);
                  if (!open) {
                    if (selectedEmployee) {
                      setEmployeeQuery(memberDisplayName(selectedEmployee));
                    } else {
                      setEmployeeQuery('');
                    }
                  }
                }}
                value={selectedEmployee ? memberDisplayName(selectedEmployee) : null}
                onValueChange={(val) => handleEmployeeSelect(val as string)}
                inputValue={employeeQuery}
                onInputValueChange={setEmployeeQuery}
              >
                <div className="flex items-center border-b-[1.5px] border-[#d1d5db] focus-within:border-primary transition-colors duration-150 bg-transparent">
                  <User className="mr-2 size-4 shrink-0 text-[#6b7280]" />
                  <ComboboxInput
                    placeholder="Search employee name or email..."
                    showTrigger={false}
                    showClear={false}
                    className="w-full border-0 rounded-none shadow-none bg-transparent [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div]:h-auto"
                  />
                  {selectedEmployee && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployeeMemberId(null);
                        setEmployeeQuery('');
                      }}
                      className="ml-1 flex size-5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
                </div>

                <ComboboxContent className="p-1 shadow-none border border-[#e2e5ea] rounded-lg">
                  <ComboboxList>
                    {filteredEmployees.length === 0 ? (
                      <ComboboxEmpty>No employees found</ComboboxEmpty>
                    ) : (
                      filteredEmployees.map((m) => (
                        <ComboboxItem
                          key={m.id}
                          value={memberDisplayName(m)}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-selected:bg-[#f8f9fa]"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                            <User className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#111827] truncate">{memberDisplayName(m)}</p>
                            {m.email && (
                              <p className="text-[11px] text-[#6b7280] truncate">{m.email}</p>
                            )}
                          </div>
                        </ComboboxItem>
                      ))
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {isSelfAssigned ? (
                <span className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#156f3d]">
                  <Check className="size-3" />
                  Assigned to you
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeMemberId(memberId);
                    const me = members.find((m) => m.id === memberId);
                    if (me) {
                      setEmployeeQuery(memberDisplayName(me));
                    }
                  }}
                  className="mt-1.5 text-[12px] font-medium text-primary hover:text-[var(--indigo-10)] transition-colors"
                >
                  Assign to myself
                </button>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Asset</Label>
              <Combobox
                open={isGroupOpen}
                onOpenChange={(open) => {
                  setIsGroupOpen(open);
                  if (!open) {
                    if (selectedGroup) {
                      setGroupQuery(groupDisplayLabel(selectedGroup));
                    } else {
                      setGroupQuery('');
                    }
                  }
                }}
                value={selectedGroup ? groupDisplayLabel(selectedGroup) : null}
                onValueChange={(val) => handleGroupSelect(val as string)}
                inputValue={groupQuery}
                onInputValueChange={setGroupQuery}
              >
                <div className="flex items-center border-b-[1.5px] border-[#d1d5db] focus-within:border-primary transition-colors duration-150 bg-transparent">
                  <LaptopMinimal className="mr-2 size-4 shrink-0 text-[#6b7280]" />
                  <ComboboxInput
                    placeholder="Search asset name, code, or model..."
                    showTrigger={false}
                    showClear={false}
                    className="w-full border-0 rounded-none shadow-none bg-transparent [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div]:h-auto"
                  />
                  {selectedGroup && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); setGroupQuery(''); }}
                      className="ml-1 flex size-5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
                </div>

                <ComboboxContent className="p-1 shadow-none border border-[#e2e5ea] rounded-lg">
                  <ComboboxList>
                    {isGroupsLoading ? (
                      <div className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">Loading...</div>
                    ) : filteredGroups.length === 0 ? (
                      <ComboboxEmpty>No available assets found</ComboboxEmpty>
                    ) : (
                      filteredGroups.map((g) => (
                        <ComboboxItem
                          key={g.groupKey}
                          value={groupDisplayLabel(g)}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-selected:bg-[#f8f9fa]"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                            <PackagePlus className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#111827] truncate">{groupDisplayLabel(g)}</p>
                            <p className="text-[11px] text-[#6b7280]">
                              {g.model ? `${g.model} \u00B7 ` : ''}
                              Available: {g.availableQuantity}
                            </p>
                          </div>
                          <Badge className="rounded-full bg-[#eef9f1] px-2.5 py-0.5 text-[11px] font-medium text-[#156f3d] border-0 shrink-0">
                            {g.availableQuantity}
                          </Badge>
                        </ComboboxItem>
                      ))
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => void handleIssue()}
              disabled={!selectedEmployeeMemberId || !selectedGroup || isIssuing || !canManageAssets}
              className="rounded-lg bg-primary px-5 py-2 text-[13px] font-medium text-white hover:bg-[var(--indigo-10)] disabled:opacity-40"
            >
              {isIssuing ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Issuing...
                </span>
              ) : (
                'Issue Asset'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isIssuing}
              className="rounded-lg px-4 py-2 text-[13px] font-medium"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Issued Assets Table Container */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Search Input in Card Header */}
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
