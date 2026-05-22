'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorkLogReportRow } from '@/modules/attendance/types/workLogReportTypes';
import { formatDate, formatHours, formatTime } from '@/modules/attendance/utils/attendanceFormatters';

interface WorkLogDirectoryTableProps {
  rows: WorkLogReportRow[];
  isLoading?: boolean;
  pageSize: number;
  onViewFullLog: (attendanceRecordId: string) => void;
}

const SKELETON_IDS = Array.from({ length: 12 }, (_, index) => `skeleton-${index}`);

export function WorkLogDirectoryTable({
  rows,
  isLoading = false,
  pageSize,
  onViewFullLog,
}: Readonly<WorkLogDirectoryTableProps>) {
  return (
    <div className="w-full bg-transparent">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="px-4">Employee Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Clock-In</TableHead>
            <TableHead>Clock-Out</TableHead>
            <TableHead>Total Hours Worked</TableHead>
            <TableHead className="min-w-[340px]">Daily Work Log</TableHead>
            <TableHead className="px-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            SKELETON_IDS.slice(0, pageSize).map((id) => (
              <TableRow key={id}>
                <TableCell className="px-4" colSpan={7}>
                  <div className="h-10 animate-pulse rounded-xl bg-muted" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.attendanceRecordId}>
                <TableCell className="px-4 font-medium text-foreground">{row.employeeName}</TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell>{formatTime(row.clockIn)}</TableCell>
                <TableCell>{formatTime(row.clockOut)}</TableCell>
                <TableCell>{formatHours(row.totalHours)}</TableCell>
                <TableCell className="max-w-[340px] whitespace-normal text-sm leading-6 text-muted-foreground">
                  {row.dailyWorkLogPreview || '—'}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <Button type="button" variant="ghost" onClick={() => onViewFullLog(row.attendanceRecordId)}>
                    View Full Log
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No work-log records match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
