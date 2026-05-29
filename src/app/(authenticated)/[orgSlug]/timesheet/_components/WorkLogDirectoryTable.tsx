'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { WorkLogReportRow } from '@/modules/attendance/types/workLogReportTypes';
import { formatDate, formatHours, formatTime } from '@/modules/attendance/utils/attendanceFormatters';

interface WorkLogDirectoryTableProps {
  rows: WorkLogReportRow[];
  isLoading?: boolean;
  pageSize: number;
  onRowClick: (attendanceRecordId: string) => void;
}

const SKELETON_IDS = Array.from({ length: 12 }, (_, index) => `skeleton-${index}`);
const columnHelper = createColumnHelper<WorkLogReportRow>();
const COLUMN_WIDTHS = ['36%', '18%', '14%', '14%', '18%'] as const;

const columns = [
  columnHelper.accessor('employeeName', {
    header: 'Employee Name',
    cell: (info) => (
      <span className="block truncate font-medium text-foreground" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('clockIn', {
    header: 'Clock-In',
    cell: (info) => formatTime(info.getValue()),
  }),
  columnHelper.accessor('clockOut', {
    header: 'Clock-Out',
    cell: (info) => formatTime(info.getValue()),
  }),
  columnHelper.accessor('totalHours', {
    header: 'Hours Worked',
    cell: (info) => formatHours(info.getValue()),
  }),
];

export function WorkLogDirectoryTable({
  rows,
  isLoading = false,
  pageSize,
  onRowClick,
}: Readonly<WorkLogDirectoryTableProps>) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full bg-transparent">
      <Table className="table-fixed">
        <colgroup>
          {COLUMN_WIDTHS.map((width, index) => (
            <col key={`${index}-${width}`} style={{ width }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/40">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(header.column.id === 'employeeName' ? 'px-4' : '')}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            SKELETON_IDS.slice(0, pageSize).map((id) => (
              <TableRow key={id}>
                <TableCell className="px-4" colSpan={5}>
                  <div className="h-10 animate-pulse rounded-xl bg-muted" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onRowClick(row.original.attendanceRecordId)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.id === 'employeeName' ? 'px-4' : ''}>
                    <div className="min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No timesheet entries match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
