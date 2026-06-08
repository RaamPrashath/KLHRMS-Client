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
import { ArrowLeftRight, ChevronDown, ChevronUp, RefreshCw, UserPlus, Wrench } from 'lucide-react';
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
import { formatDate } from '@/modules/assets/lib/assetUtils';
import type { RecentActivityItem } from './dashboard.types';

const activityConfig: Record<string, { icon: typeof UserPlus; label: string }> = {
  ASSIGNED: { icon: UserPlus, label: 'Assigned' },
  RETURNED: { icon: RefreshCw, label: 'Returned' },
  MAINTENANCE: { icon: Wrench, label: 'Maintenance' },
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
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shrink-0',
                type === 'ASSIGNED'
                  ? 'text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/30'
                  : type === 'RETURNED'
                    ? 'text-purple-600 bg-purple-50 border-purple-100 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-900/30'
                    : 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30',
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {config.label}
            </span>
          );
        },
      },
      {
        id: 'assetName',
        header: 'Asset',
        accessorFn: (row: RecentActivityItem) => row.assetName,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{getValue()}</span>
        ),
      },
      {
        id: 'memberName',
        header: 'Person',
        accessorFn: (row: RecentActivityItem) => row.memberName ?? '\u2014',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{getValue()}</span>
        ),
      },
      {
        id: 'detail',
        header: 'Detail',
        accessorFn: (row: RecentActivityItem) => row.detail ?? '\u2014',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="block max-w-40 truncate text-xs text-muted-foreground" title={getValue()}>
            {getValue()}
          </span>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        accessorFn: (row: RecentActivityItem) => row.date,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-right text-xs text-muted-foreground font-medium tabular-nums block">
            {formatDate(getValue())}
          </span>
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
    initialState: { pagination: { pageSize: 5 } },
  });

  if (!items.length) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-[13px] text-muted-foreground font-medium">
        No recent activity
      </div>
    );
  }

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalEntries = items.length;
  const startEntry = pageIndex * pageSize + 1;
  const endEntry = Math.min(startEntry + pageSize - 1, totalEntries);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent border-b border-border">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isRight = header.id === 'date';
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-3.5 px-6 border-b border-border bg-slate-50/50 dark:bg-slate-900/10 h-auto',
                        isRight && 'text-right',
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1 font-bold',
                            canSort ? 'cursor-pointer select-none' : '',
                            isRight && 'justify-end w-full',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="flex flex-col shrink-0">
                              <ChevronUp
                                className={`size-3 -mb-1 ${
                                  header.column.getIsSorted() === 'asc'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                              <ChevronDown
                                className={`size-3 ${
                                  header.column.getIsSorted() === 'desc'
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-300 dark:text-slate-700'
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
                className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'py-3.5 px-6 font-medium text-slate-750 dark:text-slate-350',
                      cell.column.id === 'date' && 'text-right',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
          <span className="font-medium">
            Showing {startEntry}-{endEntry} of {totalEntries} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
            >
              Previous
            </Button>
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
  );
}
