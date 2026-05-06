import type { AttendanceTodayStatus } from '@/modules/employees/types/employeeTypes';

interface AttendanceBadgeProps {
  status: AttendanceTodayStatus;
}

const CONFIG: Record<
  AttendanceTodayStatus,
  { label: string; className: string }
> = {
  PRESENT: {
    label: 'Present',
    className: 'bg-success-bg text-success-text',
  },
  ABSENT: {
    label: 'Absent',
    className: 'bg-destructive-bg text-destructive-text',
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    className: 'bg-info-bg text-info-text',
  },
  HALF_DAY: {
    label: 'Half Day',
    className: 'bg-warning-bg text-warning-text',
  },
  NO_RECORD: {
    label: 'No Record',
    className: 'bg-neutral-50 text-neutral-500',
  },
};

export function AttendanceBadge({ status }: AttendanceBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.NO_RECORD;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
