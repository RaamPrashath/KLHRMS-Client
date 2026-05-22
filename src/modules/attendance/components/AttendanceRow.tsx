import {
  formatDate,
  formatTime,
} from '@/modules/attendance/utils/attendanceFormatters';
import type { AttendanceRecord, AttendanceStatus } from '@/modules/attendance/types/attendanceTypes';
import { FileText } from 'lucide-react';

interface AttendanceRowProps {
  record: AttendanceRecord;
  showEmployeeColumn: boolean;
  onViewWorkLog?: (attendanceRecordId: string) => void;
}

function getStatusInfo(status: AttendanceStatus) {
  if (status === 'PRESENT') return { text: 'Present', color: '#00874A' };
  if (status === 'ABSENT') return { text: 'Absent', color: '#EA4335' };
  if (status === 'HALF_DAY') return { text: 'Half Day', color: '#FBBC05' };
  return { text: status, color: '#6E6E73' };
}

export function AttendanceRow({
  record,
  showEmployeeColumn,
  onViewWorkLog,
}: Readonly<AttendanceRowProps>) {
  const statusInfo = getStatusInfo(record.status);

  return (
    <div className="flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4">
      {showEmployeeColumn && (
        <div className="flex-1 flex justify-center">
          <span className="block truncate text-sm font-medium text-neutral-900" title={record.employeeName ?? undefined}>
            {record.employeeName ?? '—'}
          </span>
        </div>
      )}

      <div className="flex-1 flex justify-center">
        <span className="text-sm text-neutral-700">{formatDate(record.date)}</span>
      </div>

      <div className="flex-1 flex justify-center">
        <span className="text-sm text-neutral-700">{formatTime(record.clockIn) || '—'}</span>
      </div>

      <div className="flex-1 flex justify-center">
        <span className="text-sm text-neutral-700">{formatTime(record.clockOut) || '—'}</span>
      </div>

      <div className="flex-1 flex justify-center">
        <span className="text-sm font-semibold text-neutral-900">
          {record.totalHours != null ? `${record.totalHours.toFixed(1)}h` : '—'}
        </span>
      </div>

      <div className="flex-1 flex justify-center">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
          style={{ backgroundColor: `${statusInfo.color}0D`, color: statusInfo.color }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: statusInfo.color }} />
          {statusInfo.text}
        </div>
      </div>

      {/* Work Log column */}
      <div className="flex-1 flex justify-center">
        {record.status === 'PRESENT' || record.status === 'HALF_DAY' ? (
          <button
            type="button"
            onClick={() => onViewWorkLog?.(record.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            aria-label={`View work log for ${formatDate(record.date)}`}
          >
            <FileText className="size-3.5" strokeWidth={1.5} />
            View Log
          </button>
        ) : (
          <span className="text-sm text-neutral-300">—</span>
        )}
      </div>
    </div>
  );
}
