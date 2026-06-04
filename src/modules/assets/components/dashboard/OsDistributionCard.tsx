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
import { ChevronDown, ChevronUp, MonitorCog } from 'lucide-react';
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
import type { OsDistributionAnalytics, OsDistributionRow } from './dashboard.types';

function EmptyState({
  title,
  description,
  tone = 'muted',
}: {
  title: string;
  description: string;
  tone?: 'muted' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center',
        tone === 'warning'
          ? 'border-[#f1d7a7] bg-[#fff8ea]'
          : 'border-[#d8dde5] bg-[#fbfcfb]',
      )}
    >
      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl',
          tone === 'warning' ? 'bg-white text-[#8a5a00]' : 'bg-white text-[#6e6e73]',
        )}
      >
        <MonitorCog className="size-5" />
      </div>
      <p className="mt-3 text-[15px] font-medium text-[#111827]">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-5 text-[#6e6e73]">{description}</p>
    </div>
  );
}

export function OsDistributionCard({
  data,
  isLoading,
  isError,
}: {
  data?: OsDistributionAnalytics;
  isLoading: boolean;
  isError: boolean;
}) {
  const rows = data?.rows ?? [];
  const [sorting, setSorting] = useState<SortingState>([{ id: 'percentage', desc: true }]);

  const columns = useMemo(
    () => [
      {
        id: 'osName',
        header: 'OS',
        accessorFn: (row: OsDistributionRow) => row.osName,
        cell: ({ getValue }: { getValue: () => string }) => (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                getValue().toLowerCase().includes('mac')
                  ? 'bg-[#6b7280]'
                  : getValue().toLowerCase().includes('windows')
                    ? 'bg-[#2563eb]'
                    : getValue().toLowerCase().includes('linux')
                      ? 'bg-[#d97706]'
                      : 'bg-[#94a3b8]',
              )}
            />
            <span className="text-[13px] font-medium text-[#1d1d1f]">{getValue()}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'headcount',
        header: 'Users',
        accessorFn: (row: OsDistributionRow) => row.headcount,
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] tabular-nums text-[#6e6e73]">{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'percentage',
        header: 'Share',
        accessorFn: (row: OsDistributionRow) => Math.round(row.percentage),
        cell: ({ row: tableRow }: { row: { original: OsDistributionRow } }) => {
          const pct = Math.round(tableRow.original.percentage);
          return (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e9eef2]">
                <div
                  className="h-full rounded-lg bg-primary"
                  style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                />
              </div>
              <span className="w-9 text-right text-[13px] font-semibold tabular-nums text-[#1d1d1f]">
                {pct}%
              </span>
            </div>
          );
        },
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="border-b border-[#eef0f3] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
              OS Distribution
            </h3>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Laptop user operating systems across currently assigned inventory
            </p>
          </div>
          <div className="rounded-full bg-[#f3f8f5] px-3 py-1 text-[12px] font-semibold text-[#156f3d]">
            {data?.totalLaptopUsers ?? 0} users
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-[24px] bg-[#f3f4f6]" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[#f3f4f6]" />
                </div>
                <div className="h-2.5 animate-pulse rounded-full bg-[#f3f4f6]" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            tone="warning"
            title="OS analytics unavailable"
            description="The dashboard stayed up, but this analytics feed did not return data."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No OS distribution yet"
            description="Assigned laptop inventory with operating-system metadata will appear here."
          />
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
                    <TableRow key={row.id} className="border-b border-[#f0f0f2]">
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
