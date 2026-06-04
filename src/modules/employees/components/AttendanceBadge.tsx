import type { AttendanceTodayStatus } from '@/modules/employees/types/employeeTypes';

interface AttendanceBadgeProps {
  status: AttendanceTodayStatus | 'HOLIDAY';
}

const CONFIG: Record<
  AttendanceTodayStatus | 'HOLIDAY',
  { label: string; color: string }
> = {
  PRESENT: {
    label: 'Present',
    color: '#00874A',
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    color: '#0066CC',
  },
  HALF_DAY: {
    label: 'Half Day',
    color: '#FBBC05',
  },
  ABSENT: {
    label: 'Absent',
    color: '#EA4335',
  },
  HOLIDAY: {
    label: 'Holiday',
    color: '#EA4335',
  },
  NO_RECORD: {
    label: 'No Record',
    color: '#6E6E73',
  },
};

export function AttendanceBadge({ status }: Readonly<AttendanceBadgeProps>) {
  const { label, color } = CONFIG[status] ?? CONFIG.NO_RECORD;

  const renderDot = () => {
    if (status === 'PRESENT' || status === 'WORK_FROM_HOME' || status === 'HOLIDAY') {
      return (
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      );
    }
    if (status === 'HALF_DAY') {
      return (
        <span
          className="size-1.5 rounded-full border shrink-0"
          style={{
            borderColor: color,
            background: `linear-gradient(to top, ${color} 50%, transparent 50%)`,
          }}
        />
      );
    }
    if (status === 'ABSENT') {
      return (
        <span
          className="size-1.5 rounded-full border shrink-0"
          style={{ borderColor: color }}
        />
      );
    }
    return (
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ backgroundColor: '#6E6E73' }}
      />
    );
  };

  return (
    <div className="flex items-center justify-center">
      <span
        className="inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold w-[90px] h-[24px] select-none"
        style={{
          backgroundColor: `${color}0D`,
          color: color,
        }}
      >
        {renderDot()}
        {label}
      </span>
    </div>
  );
}
