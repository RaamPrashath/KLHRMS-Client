import { Pencil, Trash2 } from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatHours,
} from '@/modules/attendance/utils/attendanceFormatters';
import type { AttendanceRecord, AttendanceStatus } from '@/modules/attendance/types/attendanceTypes';

interface AttendanceRowProps {
  record: AttendanceRecord;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

const STATUS_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success-bg text-success-text',
  HALF_DAY: 'bg-warning-bg text-warning-text',
  ABSENT: 'bg-destructive-bg text-destructive-text',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
};

export function AttendanceRow({
  record,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Readonly<AttendanceRowProps>) {
  const statusClass = STATUS_CLASSES[record.status] ?? 'bg-neutral-100 text-neutral-500';
  const statusLabel = STATUS_LABELS[record.status] ?? record.status;

  return (
    <tr className="border-b border-neutral-100 hover:bg-canvas">
      {/* Date — formatted from ISO date string, no UTC shift */}
      <td className="px-4 py-2 text-[13px] text-neutral-900">{formatDate(record.date)}</td>

      {/* Clock In — displayed in IST */}
      <td className="px-4 py-2 text-[13px] text-neutral-900">{formatTime(record.clockIn)}</td>

      {/* Clock Out — displayed in IST */}
      <td className="px-4 py-2 text-[13px] text-neutral-900">{formatTime(record.clockOut)}</td>

      {/* Total hours — numeric, mono, right-aligned */}
      <td className="px-4 py-2 font-mono text-[13px] text-right text-neutral-900">
        {formatHours(record.totalHours)}
      </td>

      {/* Overtime hours — numeric, mono, right-aligned */}
      <td className="px-4 py-2 font-mono text-[13px] text-right text-neutral-900">
        {formatHours(record.overtimeHours)}
      </td>

      {/* Status badge */}
      <td className="px-4 py-2">
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${statusClass}`}>
          {statusLabel}
        </span>
      </td>

      {/* Actions — only rendered when permitted */}
      {(canEdit || canDelete) && (
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                aria-label={`Edit record for ${record.date}`}
                className="bg-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 p-2 rounded-md size-8 inline-flex items-center justify-center transition-colors duration-100"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(record)}
                aria-label={`Delete record for ${record.date}`}
                className="bg-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 p-2 rounded-md size-8 inline-flex items-center justify-center transition-colors duration-100"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
