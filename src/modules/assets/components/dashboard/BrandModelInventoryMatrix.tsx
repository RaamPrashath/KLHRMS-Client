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
import { Boxes, ChevronDown, ChevronUp, Search } from 'lucide-react';
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
import type { BrandModelInventoryAnalytics, BrandModelInventoryRow } from './dashboard.types';

export function BrandModelInventoryMatrix({
  analytics,
  isLoading,
  activeRowKey,
  onRowClick,
}: {
  analytics?: BrandModelInventoryAnalytics;
  isLoading: boolean;
  activeRowKey: string | null;
  onRowClick: (row: BrandModelInventoryRow) => void;
}) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredRows = useMemo(() => {
    const rows = analytics?.rows ?? [];
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => `${row.brand} ${row.model}`.toLowerCase().includes(query));
  }, [analytics?.rows, search]);

  const columns = useMemo(
    () => [
      {
        id: 'brand',
        header: 'Brand',
        accessorFn: (row: BrandModelInventoryRow) => row.brand,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-semibold text-[#111827]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'model',
        header: 'Model',
        accessorFn: (row: BrandModelInventoryRow) => row.model,
        cell: ({
          getValue,
          row: tableRow,
        }: {
          getValue: () => string;
          row: { original: BrandModelInventoryRow };
        }) => {
          const isBusy = activeRowKey === tableRow.original.rowKey;
          return (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#111827]">{getValue()}</span>
              {isBusy && <span className="text-[11px] text-[#6e6e73]">Loading...</span>}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'totalStock',
        header: 'Total Stock',
        accessorFn: (row: BrandModelInventoryRow) => row.totalStock,
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] text-[#111827]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'inOfficeStock',
        header: 'In-Office Stock',
        accessorFn: (row: BrandModelInventoryRow) => row.inOfficeStock,
        cell: ({
          getValue,
          row: tableRow,
        }: {
          getValue: () => number;
          row: { original: BrandModelInventoryRow };
        }) => (
          <span
            className={cn(
              'text-[13px] font-medium',
              tableRow.original.lowStockAlert ? 'text-[#b3261e]' : 'text-[#156f3d]',
            )}
          >
            {getValue()}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'providedStock',
        header: 'Provided Stock',
        accessorFn: (row: BrandModelInventoryRow) => row.providedStock,
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] text-[#111827]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'maintenanceOrDamagedStock',
        header: 'Maintenance',
        accessorFn: (row: BrandModelInventoryRow) => row.maintenanceOrDamagedStock,
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] text-[#111827]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'temporaryLaptopStockDepth',
        header: 'Temp Stock Depth',
        accessorFn: (row: BrandModelInventoryRow) => row.temporaryLaptopStockDepth,
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] text-[#111827]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'lowStockAlert',
        header: 'Low Stock Alert',
        accessorFn: (row: BrandModelInventoryRow) =>
          row.lowStockAlert ? 'Low stock: 0 in office' : 'Healthy',
        cell: ({
          row: tableRow,
        }: {
          row: { original: BrandModelInventoryRow };
        }) => (
          <span
            className={cn(
              'text-[13px] font-semibold',
              tableRow.original.lowStockAlert ? 'text-[#b3261e]' : 'text-[#6e6e73]',
            )}
          >
            {tableRow.original.lowStockAlert ? 'Low stock: 0 in office' : 'Healthy'}
          </span>
        ),
        enableSorting: true,
      },
    ],
    [activeRowKey],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <section className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="flex flex-col gap-4 border-b border-[#eef0f3] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Brand &amp; Model Inventory Breakdown
          </h3>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Laptop stock by brand and model across available, issued, and maintenance states
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[320px]">
          <div className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
            <Search className="size-4 shrink-0 text-[#9ca3af]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand or model..."
              className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-lg bg-[#f3f4f6]" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[#6e6e73]">
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <Boxes className="size-5 text-[#9ca3af]" />
              <p className="mt-2 font-medium text-[#111827]">No laptop inventory matched</p>
              <p className="mt-1 text-[#6e6e73]">
                Try a different search term or add laptop inventory with model data.
              </p>
            </div>
          </div>
        ) : (
          <div>
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
                      onClick={() => onRowClick(row.original)}
                    >
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
      </div>
    </section>
  );
}
