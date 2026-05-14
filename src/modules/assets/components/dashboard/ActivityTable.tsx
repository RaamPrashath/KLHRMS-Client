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
import { ArrowLeftRight, ChevronDown, ChevronUp, Hammer, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/modules/assets/lib/assetUtils';
import type { RecentActivityItem } from './dashboard.types';

const activityConfig: Record<string, { icon: typeof UserCheck; color: string; label: string }> = {
  PROVIDED: { icon: UserCheck, color: '#2563eb', label: 'Provided' },
  RETURNED: { icon: ArrowLeftRight, color: '#7c3aed', label: 'Returned' },
  MAINTENANCE: { icon: Hammer, color: '#d97706', label: 'Maintenance' },
};

export function ActivityTable({ items }: { items: RecentActivityItem[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const columns = useMemo(
    () => [
      {
        id: 'type',
        header: 'Type',
        accessorFn: (row: RecentActivityItem) => row.type,
        cell: ({ getValue }: { getValue: () => string }) => {
          const type = getValue();
          const config = activityConfig[type] || activityConfig.MAINTENANCE;
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${config.color}12` }}
              >
                <Icon className="size-3.5" style={{ color: config.color }} />
              </div>
              <span className="text-[13px] text-[#6e6e73]">{config.label}</span>
            </div>
          );
        },
      },
      {
        id: 'assetName',
        header: 'Asset',
        accessorFn: (row: RecentActivityItem) => row.assetName,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-medium text-[#1d1d1f]">{getValue()}</span>
        ),
      },
      {
        id: 'memberName',
        header: 'Person',
        accessorFn: (row: RecentActivityItem) => row.memberName ?? '\u2014',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-[#6e6e73]">{getValue()}</span>
        ),
      },
      {
        id: 'detail',
        header: 'Detail',
        accessorFn: (row: RecentActivityItem) => row.detail ?? '\u2014',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="block max-w-40 truncate text-[13px] text-[#6e6e73]" title={getValue()}>
            {getValue()}
          </span>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        accessorFn: (row: RecentActivityItem) => row.date,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
        ),
        enableSorting: true,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 6 } },
  });

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-10 text-[13px] text-[#6e6e73]">
        No recent activity
      </div>
    );
  }

  return (
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
  );
}
