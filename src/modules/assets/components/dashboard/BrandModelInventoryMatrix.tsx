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

const columnAlignments: Record<string, string> = {
  totalStock: 'text-center',
  inOfficeStock: 'text-center',
  providedStock: 'text-center',
  maintenanceOrDamagedStock: 'text-center',
  temporaryLaptopStockDepth: 'text-center',
  lowStockAlert: 'text-right',
};
 
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
        cell: ({ getValue }: { getValue: () => string }) => {
          const brand = getValue();
          const initial = brand ? brand.charAt(0).toUpperCase() : '?';
          return (
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {initial}
              </span>
              {brand}
            </span>
          );
        },
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
              <span className="text-[13px] text-slate-500 dark:text-slate-400">{getValue()}</span>
              {isBusy && <span className="text-[11px] text-muted-foreground animate-pulse">Loading...</span>}
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
          <div className="text-center font-bold text-slate-900 dark:text-white">{getValue()}</div>
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
        }) => {
          const val = getValue();
          return (
            <div className="text-center">
              <span
                className={cn(
                  'px-2 py-0.5 rounded font-semibold text-[13px]',
                  val > 0
                    ? 'text-emerald-600 bg-emerald-50/60 dark:text-emerald-400 dark:bg-emerald-500/10'
                    : 'text-slate-400 dark:text-slate-600',
                )}
              >
                {val}
              </span>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'providedStock',
        header: 'Provided Stock',
        accessorFn: (row: BrandModelInventoryRow) => row.providedStock,
        cell: ({ getValue }: { getValue: () => number }) => {
          const val = getValue();
          return (
            <div
              className={cn(
                'text-center text-[13px]',
                val > 0 ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-600',
              )}
            >
              {val}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'maintenanceOrDamagedStock',
        header: 'Maintenance',
        accessorFn: (row: BrandModelInventoryRow) => row.maintenanceOrDamagedStock,
        cell: ({ getValue }: { getValue: () => number }) => {
          const val = getValue();
          return (
            <div
              className={cn(
                'text-center text-[13px]',
                val > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400 dark:text-slate-600',
              )}
            >
              {val}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'temporaryLaptopStockDepth',
        header: 'Temp Stock Depth',
        accessorFn: (row: BrandModelInventoryRow) => row.temporaryLaptopStockDepth,
        cell: ({ getValue }: { getValue: () => number }) => {
          const val = getValue();
          return (
            <div
              className={cn(
                'text-center text-[13px]',
                val > 0 ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-600',
              )}
            >
              {val}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'lowStockAlert',
        header: 'Status Alert',
        accessorFn: (row: BrandModelInventoryRow) =>
          row.lowStockAlert ? 'Low Stock' : 'Healthy',
        cell: ({
          row: tableRow,
        }: {
          row: { original: BrandModelInventoryRow };
        }) => {
          const isLow = tableRow.original.lowStockAlert;
          return (
            <div className="flex justify-end">
              {isLow ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Healthy
                </span>
              )}
            </div>
          );
        },
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
 
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startEntry = filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const endEntry = Math.min(filteredRows.length, (pageIndex + 1) * pageSize);
 
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Brand &amp; Model Inventory Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Laptop stock by configuration, status, and thresholds.
          </p>
        </div>
 
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search brand or model..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground h-9"
          />
        </div>
      </div>
 
      <div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <Boxes className="size-6 text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">No laptop inventory matched</p>
              <p className="mt-1 text-muted-foreground">
                Try a different search term or add laptop inventory with model data.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="border-b border-border bg-slate-50/70 dark:bg-slate-900/30">
                      {hg.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4 px-6",
                              columnAlignments[header.id] || "text-left"
                            )}
                          >
                            {header.isPlaceholder ? null : (
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center gap-1",
                                  canSort ? 'cursor-pointer select-none' : '',
                                  columnAlignments[header.id] === 'text-center' ? 'mx-auto' : '',
                                  columnAlignments[header.id] === 'text-right' ? 'ml-auto' : ''
                                )}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {canSort && (
                                  <span className="flex flex-col">
                                    <ChevronUp
                                      className={cn(
                                        "size-3 -mb-1",
                                        header.column.getIsSorted() === 'asc'
                                          ? 'text-[#1d1d1f] dark:text-white'
                                          : 'text-[#d2d2d7] dark:text-[#52525b]'
                                      )}
                                    />
                                    <ChevronDown
                                      className={cn(
                                        "size-3",
                                        header.column.getIsSorted() === 'desc'
                                          ? 'text-[#1d1d1f] dark:text-white'
                                          : 'text-[#d2d2d7] dark:text-[#52525b]'
                                      )}
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
                <TableBody className="text-sm divide-y divide-border font-medium text-slate-700 dark:text-slate-300">
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer border-b border-border transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                      onClick={() => onRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4 px-6">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
 
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
              <span>
                Showing {startEntry}-{endEntry} of {filteredRows.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-1 px-3 border border-border rounded-lg bg-card text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-1 px-3 border border-border rounded-lg bg-card text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
