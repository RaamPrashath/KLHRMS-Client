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
import { formatDate, formatHours, formatTime } from '@/modules/attendance/utils/attendanceFormatters';
import { FileText, Clock, User, Calendar, Briefcase, CheckSquare } from 'lucide-react';

interface AttendanceWorkLogDialogProps {
  orgSlug: string;
  memberId: string;
  /** The attendance record ID to load the work log detail for */
  attendanceRecordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailItem({ icon, label, value }: Readonly<DetailItemProps>) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[14px] font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function AttendanceWorkLogDialog({
  orgSlug,
  memberId,
  attendanceRecordId,
  open,
  onOpenChange,
}: Readonly<AttendanceWorkLogDialogProps>) {
  const detailQuery = useWorkLogReportDetailQuery(
    orgSlug,
    memberId,
    open ? attendanceRecordId : null,
  );
  const detail = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-semibold tracking-tight">
                Daily Work Log
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                {detail
                  ? `${detail.employeeName} — ${formatDate(detail.date)}`
                  : 'Loading attendance details…'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : detail ? (
          <div className="space-y-5 pt-2">
            {/* Attendance metadata grid */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/30 p-4">
              <DetailItem
                icon={<User className="size-4" />}
                label="Employee"
                value={detail.employeeName}
              />
              <DetailItem
                icon={<Calendar className="size-4" />}
                label="Date"
                value={formatDate(detail.date)}
              />
              <DetailItem
                icon={<Clock className="size-4" />}
                label="Clock In"
                value={formatTime(detail.clockIn) || '—'}
              />
              <DetailItem
                icon={<Clock className="size-4" />}
                label="Clock Out"
                value={formatTime(detail.clockOut) || '—'}
              />
              <DetailItem
                icon={<Clock className="size-4" />}
                label="Total Hours"
                value={formatHours(detail.totalHours)}
              />
              <DetailItem
                icon={<Briefcase className="size-4" />}
                label="Project / Task"
                value={
                  [detail.projectName, detail.taskName].filter(Boolean).join(' / ') || '—'
                }
              />
            </div>

            {/* Work log narrative */}
            <div className="rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <CheckSquare className="size-4 text-primary" strokeWidth={1.5} />
                <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Work Log Narrative
                </p>
              </div>
              <div className="px-4 py-4">
                {detail.dailyWorkLog ? (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                    {detail.dailyWorkLog}
                  </p>
                ) : (
                  <p className="italic text-[13px] text-muted-foreground">
                    No work log was captured for this day.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <FileText className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="mt-3 text-[14px] font-medium text-foreground">Unable to load work log</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              No work log data was found for the selected record.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
