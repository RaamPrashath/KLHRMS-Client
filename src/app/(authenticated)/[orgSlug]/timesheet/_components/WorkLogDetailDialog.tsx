'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkLogReportDetailQuery } from '@/modules/attendance/hooks/queries/workLogReports';
import { formatHours, formatTime } from '@/modules/attendance/utils/attendanceFormatters';

interface WorkLogDetailDialogProps {
  orgSlug: string;
  memberId: string;
  attendanceRecordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export function WorkLogDetailDialog({
  orgSlug,
  memberId,
  attendanceRecordId,
  open,
  onOpenChange,
}: Readonly<WorkLogDetailDialogProps>) {
  const detailQuery = useWorkLogReportDetailQuery(orgSlug, memberId, open ? attendanceRecordId : null);
  const detail = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Timesheet entry details</DialogTitle>
          <DialogDescription>Selected employee clock summary and note.</DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <DetailRow label="Employee" value={detail.employeeName} />
              <DetailRow label="Email" value={detail.employeeEmail || 'No email available'} />
              <DetailRow label="Clock In" value={formatTime(detail.clockIn)} />
              <DetailRow label="Clock Out" value={formatTime(detail.clockOut)} />
              <DetailRow label="Hours Worked" value={formatHours(detail.totalHours)} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {detail.dailyWorkLog || 'No notes captured at clock out.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load the selected timesheet entry.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
