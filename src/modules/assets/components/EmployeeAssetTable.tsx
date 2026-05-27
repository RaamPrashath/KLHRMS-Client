'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LaptopMinimal, PackageOpen } from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table';
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
import { humanize } from '@/modules/assets/lib/assetUtils';
import type { AssetCategory, AssetSummary } from '@/modules/assets/types/assetTypes';

const TABLE_HEAD_HEIGHT = 40;
const TABLE_ROW_HEIGHT = 54;
const TABLE_FOOTER_HEIGHT = 52;
const TABLE_VERTICAL_CHROME = 24;

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

function StatusDot({ status, label }: { status: string; label?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[status] || 'bg-[#9ca3af]')} />
      <span className="text-[13px] text-[#374151]">{label ?? humanize(status)}</span>
    </span>
  );
}

function calculateVisibleRows(containerTop: number) {
  const availableHeight =
    window.innerHeight - containerTop - TABLE_HEAD_HEIGHT - TABLE_FOOTER_HEIGHT - TABLE_VERTICAL_CHROME;

  return Math.max(1, Math.floor(availableHeight / TABLE_ROW_HEIGHT));
}

export function EmployeeAssetTable({
  assets,
  isLoading,
  onOpenDetail,
}: {
  assets: AssetSummary[];
  isLoading: boolean;
  onOpenDetail: (assetId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(1);
  const [{ pageIndex }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 1,
  });

  useEffect(() => {
    function updateVisibleRows() {
      if (!containerRef.current) return;
      const { top } = containerRef.current.getBoundingClientRect();
      setPageSize(calculateVisibleRows(top));
    }

    updateVisibleRows();
    window.addEventListener('resize', updateVisibleRows);

    const resizeObserver = new ResizeObserver(() => updateVisibleRows());
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateVisibleRows);
      resizeObserver.disconnect();
    };
  }, []);

  const totalRows = assets.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));

  useEffect(() => {
    if (safePageIndex !== pageIndex) {
      setPagination((current) => ({ ...current, pageIndex: safePageIndex }));
    }
  }, [pageIndex, safePageIndex]);

  const pageData = useMemo(
    () => assets.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [assets, pageSize, safePageIndex],
  );

  const pagination = useMemo(
    () => ({ pageIndex: safePageIndex, pageSize }),
    [pageSize, safePageIndex],
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
              <p className="truncate text-[14px] font-medium text-[#111827]">{asset.name}</p>
            </div>
          );
        },
      },
      {
        id: 'assetCode',
        header: 'Asset ID',
        accessorKey: 'assetCode',
        cell: ({ getValue }) => (
          <span className="text-[13px] font-medium text-[#374151]">{getValue() as string}</span>
        ),
      },
      {
        id: 'serialNumber',
        header: 'Serial No.',
        accessorKey: 'serialNumber',
        cell: ({ getValue }) => (
          <span className="text-[13px] font-mono text-[#6b7280]">{(getValue() as string | null) || '\u2014'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => <StatusDot status={getValue() as string} />,
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-[#6b7280]">{humanize(getValue() as AssetCategory)}</span>
        ),
      },
    ],
    [],
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

  const startRow = totalRows === 0 ? 0 : safePageIndex * pageSize + 1;
  const endRow = Math.min((safePageIndex + 1) * pageSize, totalRows);

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index);
    }

    const pages: (number | 'ellipsis')[] = [0];
    if (safePageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, safePageIndex - 1);
    const end = Math.min(pageCount - 2, safePageIndex + 1);
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (safePageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageCount, safePageIndex]);

  return (
    <div ref={containerRef} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
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
            Array.from({ length: pageSize }).map((_, index) => (
              <TableRow key={`employee-asset-skeleton-${index}`}>
                {columns.map((column) => (
                  <TableCell key={column.id} className="px-3 py-2.5">
                    <div className="h-4 w-full max-w-28 animate-pulse rounded bg-[#f3f4f6]" />
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
                <p className="mt-0.5 text-[13px] text-[#6b7280]">Try adjusting your search or filters</p>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-[#f8f9fa]"
                onClick={() => onOpenDetail(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
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
            {paginationPages.map((page, index) =>
              page === 'ellipsis' ? (
                <span key={`employee-ellipsis-${index}`} className="flex size-7 items-center justify-center text-[12px] text-[#6b7280]">
                  \u2026
                </span>
              ) : (
                <Button
                  key={page}
                  variant="ghost"
                  size="icon"
                  onClick={() => setPagination({ pageIndex: page, pageSize })}
                  className={cn(
                    'size-7 rounded-md text-[12px] font-medium',
                    safePageIndex === page
                      ? 'bg-[#111827] text-white hover:bg-[#111827]'
                      : 'text-[#6b7280] hover:text-[#111827]',
                  )}
                >
                  {page + 1}
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
