'use client';

import { ReactNode, useMemo, useState } from 'react';
import {
  ChevronRight,
  PackageOpen,
  Search,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { cn } from '@/lib/utils';
import { formatDate } from '@/modules/assets/lib/assetUtils';
import { ExportBand } from '@/modules/assets/components/ExportBand';
import { EmployeeAssetPivotDetailDialog } from '@/modules/assets/components/EmployeeAssetPivotDetailDialog';
import type { AssetLookupOption, AssetSummary } from '@/modules/assets/types/assetTypes';

interface EmployeePivotRow {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  assets: AssetSummary[];
  totalAssigned: number;
  earliestProvidedDate: string | null;
  earliestProviderName: string | null;
  ticketCount: number;
}

const PAGE_SIZE = 15;

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-[#eef0f3] px-6 py-4 animate-pulse">
      <div className="size-8 shrink-0 rounded-full bg-[#e5e7eb]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-[#e5e7eb]" />
        <div className="h-2.5 w-20 rounded bg-[#f3f4f6]" />
      </div>
      <div className="h-3 w-24 rounded bg-[#e5e7eb]" />
      <div className="h-3 w-20 rounded bg-[#e5e7eb]" />
      <div className="h-3 w-16 rounded bg-[#e5e7eb]" />
      <div className="size-6 rounded bg-[#e5e7eb]" />
    </div>
  );
}

export function EmployeeAssetPivotTab({
  members,
  assignedAssets,
  headerAction,
  orgSlug,
  memberId,
}: {
  members: AssetLookupOption[];
  assignedAssets?: AssetSummary[];
  headerAction?: ReactNode;
  orgSlug: string;
  memberId: string;
}) {
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [assetNameFilter, setAssetNameFilter] = useState<string[]>([]);
  const [assetNameSearch, setAssetNameSearch] = useState('');
  const [assetFilterOpen, setAssetFilterOpen] = useState(false);


  const [pageIndex, setPageIndex] = useState(0);

  const memberMap = useMemo(() => {
    const map = new Map<string, AssetLookupOption>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const allAssetNames = useMemo(() => {
    const names = new Set<string>();
    for (const asset of assignedAssets ?? []) {
      if (asset.currentHolderMemberId) names.add(asset.name);
    }
    return Array.from(names).sort();
  }, [assignedAssets]);

  const filteredAssetNames = useMemo(() => {
    if (!assetNameSearch.trim()) return allAssetNames;
    const q = assetNameSearch.toLowerCase();
    return allAssetNames.filter((n) => n.toLowerCase().includes(q));
  }, [allAssetNames, assetNameSearch]);

  const pivotRows = useMemo<EmployeePivotRow[]>(() => {
    const grouped = new Map<string, AssetSummary[]>();
    for (const asset of assignedAssets ?? []) {
      if (asset.status === 'ASSIGNED' && asset.currentHolderMemberId) {
        const list = grouped.get(asset.currentHolderMemberId) ?? [];
        list.push(asset);
        grouped.set(asset.currentHolderMemberId, list);
      }
    }

    const rows: EmployeePivotRow[] = [];
    for (const [mid, assets] of grouped) {
      const member = memberMap.get(mid);
      let earliestDate: string | null = null;
      let earliestProvider: string | null = null;
      let ticketCount = 0;

      for (const asset of assets) {
        ticketCount += asset.openMaintenanceCount ?? 0;
        if (asset.providedDate && (!earliestDate || asset.providedDate < earliestDate)) {
          earliestDate = asset.providedDate;
          earliestProvider = asset.providedByName;
        }
      }

      rows.push({
        memberId: mid,
        memberName: member?.label ?? assets[0]?.currentHolderName ?? 'Unknown',
        memberEmail: member?.email ?? null,
        assets,
        totalAssigned: assets.length,
        earliestProvidedDate: earliestDate,
        earliestProviderName: earliestProvider,
        ticketCount,
      });
    }

    rows.sort((a, b) => a.memberName.localeCompare(b.memberName));
    return rows;
  }, [assignedAssets, memberMap]);

  const filteredRows = useMemo(() => {
    let result = pivotRows;

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (r) =>
          r.memberName.toLowerCase().includes(q) ||
          (r.memberEmail ?? '').toLowerCase().includes(q),
      );
    }

    if (assetNameFilter.length > 0) {
      const nameSet = new Set(assetNameFilter);
      result = result.filter((r) => r.assets.some((a) => nameSet.has(a.name)));
    }

    return result;
  }, [pivotRows, search, assetNameFilter]);

  const totalRows = filteredRows.length;
  const pageCount = Math.ceil(totalRows / PAGE_SIZE);
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const pageData = useMemo(
    () => filteredRows.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE),
    [filteredRows, safePageIndex],
  );

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const pages: (number | 'ellipsis')[] = [0];
    if (safePageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, safePageIndex - 1);
    const end = Math.min(pageCount - 2, safePageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageCount, safePageIndex]);

  const startRow = totalRows === 0 ? 0 : safePageIndex * PAGE_SIZE + 1;
  const endRow = Math.min((safePageIndex + 1) * PAGE_SIZE, totalRows);

  function openDetail(memberId: string) {
    setSelectedMemberId(memberId);
    setDetailOpen(true);
  }

  const selectedEmployee = useMemo(
    () => (selectedMemberId ? memberMap.get(selectedMemberId) ?? null : null),
    [selectedMemberId, memberMap],
  );
  const selectedAssets = useMemo(
    () => pivotRows.find((r) => r.memberId === selectedMemberId)?.assets ?? [],
    [pivotRows, selectedMemberId],
  );

  const hasActiveFilters = search || assetNameFilter.length > 0;

  function clearFilters() {
    setSearch('');
    setAssetNameFilter([]);
    setPageIndex(0);
  }

  const isLoading = !assignedAssets;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[#111827]">Employee Assets</h2>
        {headerAction}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="px-8 py-5 border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Employee Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }}
                className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
              />
            </div>

            {/* Asset Name Filter */}
            <Popover open={assetFilterOpen} onOpenChange={setAssetFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors',
                    assetNameFilter.length > 0
                      ? 'border-border bg-muted/30 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <Search className="size-3.5" />
                  <span>
                    {assetNameFilter.length > 0
                      ? `${assetNameFilter.length} asset${assetNameFilter.length > 1 ? 's' : ''}`
                      : 'Asset Name'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search assets..."
                    value={assetNameSearch}
                    onValueChange={setAssetNameSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No assets found.</CommandEmpty>
                    <CommandGroup>
                      {filteredAssetNames.map((name) => {
                        const isSelected = assetNameFilter.includes(name);
                        return (
                          <CommandItem
                            key={name}
                            onSelect={() => {
                              setAssetNameFilter((prev) =>
                                prev.includes(name)
                                  ? prev.filter((v) => v !== name)
                                  : [...prev, name],
                              );
                              setPageIndex(0);
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
                              {isSelected && <span className="text-[10px]">&#10003;</span>}
                            </div>
                            <span className="text-[13px]">{name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                  {assetNameFilter.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t border-[#e5e7eb] p-2">
                      {assetNameFilter.slice(0, 3).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11px] text-[#6b7280]"
                        >
                          {name.length > 15 ? name.slice(0, 15) + '...' : name}
                          <button
                            type="button"
                            onClick={() => {
                              setAssetNameFilter((prev) => prev.filter((v) => v !== name));
                            }}
                            className="hover:text-[#111827]"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      {assetNameFilter.length > 3 && (
                        <span className="text-[11px] text-[#9ca3af]">+{assetNameFilter.length - 3} more</span>
                      )}
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>


            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 rounded-xl border-border text-xs font-semibold shrink-0"
              >
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}

            {/* Export */}
            <div className="ml-auto shrink-0">
              <ExportBand
                orgSlug={orgSlug}
                memberId={memberId}
                members={members}
                domain="issued"
                showEmployeeFilter={false}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : pageData.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-center">
            <div>
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted/40 border border-border text-muted-foreground">
                <PackageOpen className="size-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-foreground">
                {hasActiveFilters ? 'No employees match your filters' : 'No employees have assets assigned'}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Use the Issue Asset button to assign equipment to employees.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50/50">
                  <th className="sticky left-0 z-10 bg-slate-50/50 px-6 py-3.5 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[220px] border-r border-border">
                    Employee
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[200px]">
                    Provided Assets
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[130px]">
                    Provided Date
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[130px]">
                    Who Provided
                  </th>
                  <th className="px-6 py-3.5 text-left text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[90px]">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-center text-[12px] font-bold text-muted-foreground uppercase tracking-wider min-w-[70px]">
                    Tickets
                  </th>
                  <th className="w-12 px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr
                    key={row.memberId}
                    className="group border-b border-border hover:bg-slate-50/30 cursor-pointer transition-colors"
                    onClick={() => openDetail(row.memberId)}
                  >
                    {/* Employee (sticky) */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/30 px-6 py-4 border-r border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-slate-50 text-muted-foreground">
                          <User className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 truncate">
                            {row.memberName}
                          </p>
                          {row.memberEmail && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {row.memberEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Provided Assets */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] text-slate-700 truncate max-w-[200px]">
                          {row.assets.slice(0, 2).map((a) => a.name).join(', ')}
                          {row.assets.length > 2 && (
                            <span className="text-muted-foreground ml-1">
                              +{row.assets.length - 2} more
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Provided Date */}
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-slate-700">
                        {row.earliestProvidedDate ? formatDate(row.earliestProvidedDate) : '—'}
                      </span>
                    </td>

                    {/* Who Provided */}
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-slate-700">
                        {row.earliestProviderName || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'size-1.5 rounded-full shrink-0',
                            row.ticketCount > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                          )}
                        />
                        <span className="text-[13px] text-slate-700 font-medium">
                          {row.ticketCount > 0 ? 'Has Tickets' : 'Active'}
                        </span>
                      </span>
                    </td>

                    {/* Tickets */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[24px] h-6 rounded-md px-1.5 text-[11px] font-semibold',
                          row.ticketCount > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-50 text-slate-400',
                        )}
                      >
                        {row.ticketCount}
                      </span>
                    </td>

                    {/* Chevron */}
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(row.memberId);
                        }}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalRows > 0 && (
          <div className="p-4 bg-slate-50/30 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span className="font-semibold text-muted-foreground">
              Showing {startRow}-{endRow} of {totalRows} entries
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((p) => p - 1)}
                disabled={safePageIndex <= 0}
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
                    variant={safePageIndex === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPageIndex(p)}
                    className={cn(
                      'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                      safePageIndex === p
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
                onClick={() => setPageIndex((p) => p + 1)}
                disabled={safePageIndex >= pageCount - 1}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <EmployeeAssetPivotDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        employeeName={selectedEmployee?.label ?? null}
        employeeEmail={selectedEmployee?.email ?? null}
        assets={selectedAssets}
      />
    </div>
  );
}
