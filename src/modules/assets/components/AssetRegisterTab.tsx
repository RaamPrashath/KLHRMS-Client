'use client';

import { memo, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LaptopMinimal,
  PackageOpen,
} from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table';
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

const PAGE_SIZE = 15;

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-[#22c55e]',
  PROVIDED: 'bg-[#3b82f6]',
  UNDER_MAINTENANCE: 'bg-[#eab308]',
  DAMAGED: 'bg-[#ef4444]',
  LOST: 'bg-[#f97316]',
  RETIRED: 'bg-[#9ca3af]',
  DISPOSED: 'bg-[#6b7280]',
};

const StatusDot = memo(function StatusDot({ status }: { status: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[status] || 'bg-[#9ca3af]')} />
      <span className="text-[13px] text-[#374151]">{humanize(status)}</span>
    </span>
  );
});

export function AssetRegisterTab({
  assets,
  isLoading,
  onOpenDetail,
  onEdit,
  onProvide,
  onMaintenance,
  onDecommission,
}: {
  assets: AssetSummary[];
  isLoading: boolean;
  onOpenDetail: (assetId: string) => void;
  onEdit: (asset: AssetSummary | AssetDetail) => void;
  onProvide: (asset: AssetSummary) => void;
  onMaintenance: (asset: AssetSummary) => void;
  onDecommission: (assetId: string) => void;
}) {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const totalRows = assets.length;
  const pageCount = Math.ceil(totalRows / pageSize);

  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));

  const pageData = useMemo(
    () => assets.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [assets, safePageIndex, pageSize],
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
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                <LaptopMinimal className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#111827] truncate">{asset.name}</p>
                <p className="text-[12px] text-[#6b7280] truncate">
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
          <span className="text-[13px] text-[#6b7280]">{humanize(getValue() as AssetCategory)}</span>
        ),
      },
      {
        id: 'serial',
        header: 'Serial No.',
        accessorKey: 'serialNumber',
        cell: ({ getValue }) => {
          const sn = getValue() as string | null;
          return (
            <span className="text-[13px] font-mono text-[#6b7280]">
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
            <span className="text-[13px] text-[#374151]">{name}</span>
          ) : (
            <span className="text-[13px] text-[#9ca3af]">In register</span>
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
                'rounded-md border-0 px-2 py-0.5 text-[12px] font-normal',
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
            <span className={cn('text-[13px]', loc ? 'text-[#6b7280]' : 'text-[#9ca3af]')}>
              {loc || '\u2014'}
            </span>
          );
        },
      },
    ],
    [onOpenDetail, onEdit, onProvide, onMaintenance, onDecommission],
  );

  const table = useReactTable({
    data: pageData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
    pageCount,
    manualPagination: true,
  });

  const startRow = safePageIndex * pageSize + 1;
  const endRow = Math.min((safePageIndex + 1) * pageSize, totalRows);

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
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b-2 border-[#e2e5ea]">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-10 px-3 text-[13px] font-semibold text-[#6b7280]"
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
              <TableRow key={`skel-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.id} className="px-3 py-2.5">
                    <div className="h-4 w-full max-w-32 animate-pulse rounded bg-[#f3f4f6]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : pageData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-4 py-14 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb]">
                  <PackageOpen className="size-5 text-[#9ca3af]" />
                </div>
                <p className="mt-3 text-[15px] font-medium text-[#111827]">No assets found</p>
                <p className="mt-0.5 text-[13px] text-[#6b7280]">
                  Try adjusting your search or filters
                </p>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((r) => (
              <TableRow
                key={r.id}
                className="group hover:bg-[#f8f9fa] cursor-pointer transition-colors"
                onClick={() => onOpenDetail(r.original.id)}
              >
                {r.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5 border-b border-[#e5e7eb]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalRows > 0 && (
        <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
          <p className="text-[12px] text-[#6b7280]">
            {startRow} &ndash; {endRow} of {totalRows}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPagination({ pageIndex: safePageIndex - 1, pageSize })}
              disabled={safePageIndex === 0}
              className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {paginationPages.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-[#6b7280]">
                  \u2026
                </span>
              ) : (
                <Button
                  key={p}
                  variant="ghost"
                  size="icon"
                  onClick={() => setPagination({ pageIndex: p, pageSize })}
                  className={cn(
                    'size-7 rounded-md text-[12px] font-medium',
                    safePageIndex === p
                      ? 'bg-[#111827] text-white hover:bg-[#111827]'
                      : 'text-[#6b7280] hover:text-[#111827]',
                  )}
                >
                  {p + 1}
                </Button>
              ),
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPagination({ pageIndex: safePageIndex + 1, pageSize })}
              disabled={safePageIndex >= pageCount - 1}
              className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


