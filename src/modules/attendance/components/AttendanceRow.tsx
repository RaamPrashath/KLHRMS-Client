import {
  formatDate,
  formatTime,
} from '@/modules/attendance/utils/attendanceFormatters';
import { PLAN_LOCATION_THEMES } from '@/modules/weekly-plan/locations';
import type { AttendanceRecord, AttendanceStatus } from '@/modules/attendance/types/attendanceTypes';

interface AttendanceRowProps {
  record: AttendanceRecord | null;
  employeeName: string;
  date: string;
  holidayName?: string;
}

const holidayTheme = PLAN_LOCATION_THEMES.HOLIDAY;

function getStatusInfo(status: AttendanceStatus, isRemote: boolean) {
  if (status === 'PRESENT' && isRemote) return { text: 'Present', color: '#0066CC' };
  if (status === 'PRESENT') return { text: 'Present', color: '#00874A' };
  if (status === 'ABSENT') return { text: 'Absent', color: '#EA4335' };
  if (status === 'HALF_DAY') return { text: 'Half Day', color: '#FBBC05' };
  return { text: status, color: '#6E6E73' };
}

function StatusDot({ status, isRemote }: { readonly status: AttendanceStatus; readonly isRemote: boolean }) {
  if (status === 'PRESENT' && isRemote) {
    return <span className="size-2 rounded-full bg-[#0066CC]" />;
  }
  if (status === 'PRESENT') {
    return <span className="size-2 rounded-full bg-[#00874A]" />;
  }
  if (status === 'HALF_DAY') {
    return (
      <span
        className="size-2 rounded-full"
        style={{
          border: '2px solid #FBBC05',
          background: 'linear-gradient(to top, #FBBC05 50%, transparent 50%)',
        }}
      />
    );
  }
  if (status === 'ABSENT') {
    return <span className="size-2 rounded-full border-2 border-[#EA4335]" />;
  }
  return <span className="size-1.5 rounded-full bg-[#6E6E73]" />;
}

export function AttendanceRow({
  record,
  employeeName,
  date,
  holidayName,
}: Readonly<AttendanceRowProps>) {
  const isHoliday = holidayName != null;

  return (
    <tr className="border-b border-black/4 transition-colors hover:bg-black/[0.02]">
      <td className="pl-6 py-3">
        <span className="block text-sm font-medium text-neutral-900 truncate" title={employeeName}>
          {employeeName}
        </span>
      </td>

      <td className="text-center py-3">
        <span className="text-sm text-neutral-700">
          {record ? formatDate(record.date) : formatDate(date)}
        </span>
      </td>

      <td className="text-center py-3">
        <span className="text-sm text-neutral-700">
          {record ? (formatTime(record.clockIn) || '—') : '—'}
        </span>
      </td>

      <td className="text-center py-3">
        <span className="text-sm text-neutral-700">
          {record ? (formatTime(record.clockOut) || '—') : '—'}
        </span>
      </td>

      <td className="text-center py-3">
        <span className="text-sm font-semibold text-neutral-900">
          {record && record.totalHours != null ? `${record.totalHours.toFixed(1)}h` : '—'}
        </span>
      </td>

      <td className="text-center py-3">
        {isHoliday ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${holidayTheme.bg} ${holidayTheme.text}`}
            title={holidayName}
          >
            <span className={`size-2 rounded-full ${holidayTheme.dot}`} />
            Holiday
          </div>
        ) : record ? (
          (() => {
            const statusInfo = getStatusInfo(record.status, record.isRemote);
            return (
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={{ backgroundColor: `${statusInfo.color}0D`, color: statusInfo.color }}
              >
                <StatusDot status={record.status} isRemote={record.isRemote} />
                {statusInfo.text}
              </div>
            );
          })()
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </td>
    </tr>
  );
}
