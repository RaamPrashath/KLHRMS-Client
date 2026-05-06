'use client';

import { AttendanceStatusCard } from '@/modules/attendance/components/AttendanceStatusCard';
import { deriveSummary, formatHours } from '@/modules/attendance/utils/attendanceFormatters';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

interface AttendanceReportPanelProps {
  items: AttendanceRecord[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

const CLOCK_STATUS_LABELS: Record<string, string> = {
  CLOCKED_IN: 'Clocked In',
  CLOCKED_OUT: 'Clocked Out',
  NO_RECORD: 'No Record',
};

export function AttendanceReportPanel({
  items,
  isLoading,
  isError,
}: Readonly<AttendanceReportPanelProps>) {
  const summary = deriveSummary(items ?? []);

  return (
    <div className="flex flex-col gap-3">
      {isError && (
        <p className="text-xs text-destructive-text">Failed to load summary.</p>
      )}
      {/* impeccable-variants-start 71d9acc5 */}
      <div data-impeccable-variants="71d9acc5" data-impeccable-variant-count="3" style={{ display: "contents" }}>
        {/* Original */}
        <div data-impeccable-variant="original">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <AttendanceStatusCard
          label="Present Days"
          value={summary.presentDays}
          isLoading={isLoading}
          />
          <AttendanceStatusCard
          label="Half Days"
          value={summary.halfDays}
          isLoading={isLoading}
          />
          <AttendanceStatusCard
          label="Absent Days"
          value={summary.absentDays}
          isLoading={isLoading}
          />
          <AttendanceStatusCard
          label="Total Hours"
          value={formatHours(summary.totalHours)}
          isLoading={isLoading}
          />
          <AttendanceStatusCard
          label="Overtime Hrs"
          value={formatHours(summary.overtimeHours)}
          isLoading={isLoading}
          />
          <AttendanceStatusCard
          label="Status"
          value={CLOCK_STATUS_LABELS[summary.clockStatus] ?? summary.clockStatus}
          isLoading={isLoading}
          />
          </div>
        </div>
        {/* Variants: insert below this line */}
      </div>
      {/* impeccable-variants-end 71d9acc5 */}
    </div>
  );
}
