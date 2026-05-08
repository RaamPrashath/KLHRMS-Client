import { ArrowRight, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
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

function getStatusInfo(status: AttendanceStatus) {
  if (status === 'PRESENT') return { text: 'Present', color: '#00874A' };
  if (status === 'ABSENT') return { text: 'Absent', color: '#EA4335' };
  if (status === 'HALF_DAY') return { text: 'Half Day', color: '#FBBC05' };
  return { text: status, color: '#6E6E73' };
}

function EmployeeAvatar({ name }: { readonly name: string | null }) {
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?';
  return (
    <div className="flex items-center gap-3.5 min-w-0 w-full px-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00874A]/[0.06] text-[#00874A] text-[13px] font-semibold border border-[#00874A]/10">
        {initials}
      </div>
      <div className="flex flex-col min-w-0 flex-1 text-left justify-center">
        <span className="truncate text-[14.5px] font-medium text-neutral-900 tracking-tight" title={name || 'Unknown'}>
          {name ?? <span className="text-neutral-400 italic">Unknown</span>}
        </span>
      </div>
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
  const statusInfo = getStatusInfo(record.status);

  return (
    <tr className="group hover:bg-[#00874A]/[0.02] transition-colors duration-200">
      {/* 1. Employee (if shown) */}
      {showEmployeeColumn && (
        <td className="px-6 py-4 align-middle border-b border-black/[0.04]">
          <EmployeeAvatar name={record.employeeName} />
        </td>
      )}

      {/* 2. Date */}
      <td className="px-6 py-4 align-middle border-b border-black/[0.04] text-center">
        <span className="text-[14.5px] font-medium text-neutral-700">
          {formatDate(record.date)}
        </span>
      </td>

      {/* 3. Clock In */}
      <td className="px-6 py-4 align-middle border-b border-black/[0.04] text-center">
        <span className="text-[14.5px] font-medium text-neutral-700">
          {formatTime(record.clockIn) || '—'}
        </span>
      </td>

      {/* 4. Clock Out */}
      <td className="px-6 py-4 align-middle border-b border-black/[0.04] text-center">
        <span className="text-[14.5px] font-medium text-neutral-700">
          {formatTime(record.clockOut) || '—'}
        </span>
      </td>

      {/* 5. Work Time */}
      <td className="px-6 py-4 align-middle border-b border-black/[0.04] text-center">
        <span className="text-[14.5px] font-semibold text-neutral-900 font-sans tracking-tight">
          {record.totalHours != null ? `${record.totalHours.toFixed(1)}h` : '—'}
        </span>
      </td>

      {/* 6. Status Pill */}
      <td className="px-6 py-4 align-middle border-b border-black/[0.04] text-center">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-black/[0.03] w-max"
               style={{ backgroundColor: `${statusInfo.color}0D` }}>
            <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: statusInfo.color }} />
            <span className="text-[12.5px] font-medium truncate" style={{ color: statusInfo.color }}>
               {statusInfo.text}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}
