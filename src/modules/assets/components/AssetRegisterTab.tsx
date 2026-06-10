'use client';

import { memo, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LaptopMinimal,
  PackageOpen,
  Search,
  X,
} from 'lucide-react';
import { ExportBand } from '@/modules/assets/components/ExportBand';
import type { AssetLookupOption } from '@/modules/assets/types/assetTypes';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  conditionBadge,
  humanize,
} from '@/modules/assets/lib/assetUtils';
import type {
  AssetCategory,
  AssetCondition,
  AssetSummary,
  AssetDetail,
} from '@/modules/assets/types/assetTypes';

const PAGE_SIZE = 10;

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-[#22c55e]',
  ASSIGNED: 'bg-[#3b82f6]',
  IN_MAINTENANCE: 'bg-[#eab308]',
  PENDING_RETURN: 'bg-[#f59e0b]',
  DAMAGED: 'bg-[#ef4444]',
  LOST: 'bg-[#f97316]',
  RETIRED: 'bg-[#9ca3af]',
  DISPOSED: 'bg-[#6b7280]',
};

const StatusDot = memo(function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[status] || 'bg-[#9ca3af]')} />
      <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">{humanize(status)}</span>
    </span>
  );
});

export function AssetRegisterTab({
  assets,
  isLoading,
  canManageAssets,
  orgSlug,
  memberId,
  members,
  onOpenDetail,
  onEdit,
  onProvide,
  onMaintenance,
  onDecommission,
}: {
  assets: AssetSummary[];
  isLoading: boolean;
  canManageAssets: boolean;
  orgSlug: string;
  memberId: string;
  members: AssetLookupOption[];
  onOpenDetail: (assetId: string) => void;
  onEdit: (asset: AssetSummary | AssetDetail) => void;
  onProvide: (asset: AssetSummary) => void;
  onMaintenance: (asset: AssetSummary) => void;
  onDecommission: (assetId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const asset of assets) {
      if (asset.category) values.add(asset.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    for (const asset of assets) {
      if (asset.status) values.add(asset.status);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let result = assets;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          (a.serialNumber ?? '').toLowerCase().includes(q) ||
          (a.model ?? '').toLowerCase().includes(q) ||
          (a.location ?? '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'ALL') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result;
  }, [assets, search, categoryFilter, statusFilter]);

  const totalRows = filteredAssets.length;
  const pageCount = Math.ceil(totalRows / pageSize);
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));

  const pageData = useMemo(
    () => filteredAssets.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [filteredAssets, safePageIndex, pageSize],
  );

  const pagination = useMemo(
    () => ({ pageIndex: safePageIndex, pageSize }),
    [safePageIndex, pageSize],
  );

  const columns = useMemo<ColumnDef<AssetSummary>[]>(
    () => [
      {
        id: 'asset',
        header: 'Asset',
        accessorKey: 'name',
        cell: ({ row }) => {
          const asset = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/10 text-muted-foreground">
                <LaptopMinimal className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{asset.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {asset.assetCode}
                  {asset.serialNumber ? ` \u00B7 ${asset.serialNumber}` : ''}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-muted-foreground font-medium">{humanize(getValue() as AssetCategory)}</span>
        ),
      },
      {
        id: 'serial',
        header: 'Serial No.',
        accessorKey: 'serialNumber',
        cell: ({ getValue }) => {
          const sn = getValue() as string | null;
          return (
            <span className="text-[13px] font-mono text-muted-foreground font-medium">
              {sn || '\u2014'}
            </span>
          );
        },
      },
      {
        id: 'holder',
        header: 'Holder',
        accessorKey: 'currentHolderName',
        cell: ({ getValue }) => {
          const name = getValue() as string | null;
          return name ? (
            <span className="text-[13px] text-slate-700 dark:text-slate-350 font-medium">{name}</span>
          ) : (
            <span className="text-[13px] text-muted-foreground">In register</span>
          );
        },
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorKey: 'condition',
        cell: ({ getValue }) => {
          const condition = getValue() as AssetCondition;
          return (
            <Badge
              className={cn(
                'rounded-md border-0 px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                conditionBadge(condition),
              )}
            >
              {humanize(condition)}
            </Badge>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => <StatusDot status={getValue() as string} />,
      },
      {
        id: 'location',
        header: 'Location',
        accessorKey: 'location',
        cell: ({ getValue }) => {
          const loc = getValue() as string | null;
          return (
            <span className={cn('text-[13px] font-medium', loc ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
              {loc || '\u2014'}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: pageData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { pagination },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        setPagination((prev) => updater(prev));
      } else {
        setPagination(updater);
      }
    },
    pageCount,
    manualPagination: true,
  });

  const startRow = safePageIndex * pageSize + 1;
  const endRow = Math.min((safePageIndex + 1) * pageSize, totalRows);

  const hasActiveFilters = search.trim() !== '' || categoryFilter !== 'ALL' || statusFilter !== 'ALL';

  function handleClearFilters() {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
  }

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (safePageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, safePageIndex - 1);
    const end = Math.min(pageCount - 2, safePageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageCount, safePageIndex]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Search and Filter Section inside Card Container */}
      <div className="px-8 py-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search assets by brand, model, serial..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
              }}
              className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
              }}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs border border-border bg-card rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Category</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {humanize(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
              }}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs border border-border bg-card rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Status</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {humanize(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-9 rounded-xl border-border hover:bg-muted text-xs font-semibold px-3"
              >
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {canManageAssets && (
            <ExportBand
              orgSlug={orgSlug}
              memberId={memberId}
              members={members}
              domain="register"
              showEmployeeFilter={false}
            />
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
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
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skel-${i}`} className="border-b border-border">
                  {columns.map((col) => (
                    <TableCell key={col.id} className="px-6 py-4">
                      <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted/60" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-6 py-14 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground border border-border mb-3">
                    <PackageOpen className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No assets found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Try adjusting your search query or status filter criteria
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors cursor-pointer"
                  onClick={() => onOpenDetail(r.original.id)}
                >
                  {r.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-3.5 font-medium text-slate-750 dark:text-slate-350">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer Section */}
      {totalRows > 0 && (
        <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
          <span className="font-semibold">
            Showing {startRow}-{endRow} of {totalRows} entries
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ pageIndex: safePageIndex - 1, pageSize })}
              disabled={safePageIndex === 0}
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
                  onClick={() => setPagination({ pageIndex: p, pageSize })}
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
              onClick={() => setPagination({ pageIndex: safePageIndex + 1, pageSize })}
              disabled={safePageIndex >= pageCount - 1}
              className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
