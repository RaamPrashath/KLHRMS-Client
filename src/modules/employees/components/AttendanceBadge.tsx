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
    className: 'bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10',
  },
  ABSENT: {
    label: 'Absent',
    className: 'bg-[#EA4335]/[0.08] text-[#EA4335] border border-[#EA4335]/10',
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    className: 'bg-[#4285F4]/[0.08] text-[#4285F4] border border-[#4285F4]/10',
  },
  HALF_DAY: {
    label: 'Half Day',
    className: 'bg-[#FBBC05]/[0.08] text-[#FBBC05] border border-[#FBBC05]/10',
  },
  NO_RECORD: {
    label: 'No Record',
    className: 'bg-neutral-100 text-neutral-500 border border-neutral-200',
  },
};

export function AttendanceBadge({ status }: AttendanceBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.NO_RECORD;
  return (
    <div className="flex items-center justify-end">
      <span
        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${className}`}
      >
        {label}
      </span>
    </div>
  );
}
