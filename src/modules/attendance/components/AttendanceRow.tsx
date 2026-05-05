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
  showEmployeeColumn: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
};

function getStatusClasses(status: AttendanceStatus): string {
  if (status === 'PRESENT') return 'bg-success-bg text-success-text ring-success-text/20';
  if (status === 'ABSENT') return 'bg-destructive-bg text-destructive-text ring-destructive-text/20';
  if (status === 'HALF_DAY') return 'bg-warning-bg text-warning-text ring-warning-text/20';
  return 'bg-neutral-50 text-neutral-600 ring-neutral-500/20';
}

function EmployeeAvatar({ name }: { readonly name: string | null }) {
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
        {initials}
      </div>
      <span className="truncate text-[13px] font-medium text-neutral-900">
        {name ?? <span className="text-neutral-400 italic">Unknown</span>}
      </span>
    </div>
  );
}

export function AttendanceRow({
  record,
  canEdit,
  canDelete,
  showEmployeeColumn,
  onEdit,
  onDelete,
}: Readonly<AttendanceRowProps>) {
  const statusLabel = STATUS_LABELS[record.status] ?? record.status;
  const statusClasses = getStatusClasses(record.status);

  return (
    <tr className="group hover:bg-canvas/80 transition-colors duration-150">
      {/* Employee name — org-scope only */}
      {showEmployeeColumn && (
        <td className="px-6 py-3.5 whitespace-nowrap max-w-[200px]">
          <EmployeeAvatar name={record.employeeName} />
        </td>
      )}

      {/* Date */}
      <td className="px-6 py-3.5 text-[13px] font-medium text-neutral-900 whitespace-nowrap">
        {formatDate(record.date)}
      </td>

      {/* Clock In */}
      <td className="px-6 py-3.5 text-[13px] text-neutral-600 font-mono whitespace-nowrap">
        {formatTime(record.clockIn)}
      </td>

      {/* Clock Out */}
      <td className="px-6 py-3.5 text-[13px] text-neutral-600 font-mono whitespace-nowrap">
        {formatTime(record.clockOut)}
      </td>

      {/* Total hours */}
      <td className="px-6 py-3.5 font-mono text-[13px] text-right text-neutral-900 font-medium">
        {formatHours(record.totalHours)}
      </td>

      {/* Status badge */}
      <td className="px-6 py-3.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center justify-center text-[11px] font-semibold tracking-wide uppercase rounded-full px-2.5 py-1 ring-1 ring-inset ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </td>

      {/* Actions */}
      {(canEdit || canDelete) && (
        <td className="px-6 py-3.5 text-right w-[100px]">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                aria-label={`Edit record for ${record.date}`}
                className="bg-transparent text-neutral-400 hover:bg-surface hover:text-primary hover:shadow-sm hover:ring-1 hover:ring-neutral-200 p-1.5 rounded-md transition-all duration-200"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(record)}
                aria-label={`Delete record for ${record.date}`}
                className="bg-transparent text-neutral-400 hover:bg-destructive-bg hover:text-destructive-text hover:shadow-sm hover:ring-1 hover:ring-destructive-text/20 p-1.5 rounded-md transition-all duration-200"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
