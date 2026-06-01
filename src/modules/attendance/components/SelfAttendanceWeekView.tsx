'use client';

import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyAttendanceQuery } from '@/modules/attendance/hooks/queries/attendance';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { formatTime } from '@/modules/attendance/utils/attendanceFormatters';
import type { AttendanceRecord, AttendanceStatus } from '@/modules/attendance/types/attendanceTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusInfo(status: AttendanceStatus | null, isLeave: boolean) {
  if (isLeave) return { text: 'On Leave', color: '#EA4335' };
  if (status === 'PRESENT') return { text: 'Present', color: '#00874A' };
  if (status === 'ABSENT') return { text: 'Absent', color: '#EA4335' };
  if (status === 'HALF_DAY') return { text: 'Half Day', color: '#FBBC05' };
  return null;
}

function StatusDot({ status, isLeave }: { readonly status: AttendanceStatus | null; readonly isLeave: boolean }) {
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
  if (status === 'ABSENT' || isLeave) {
    return <span className="size-2 rounded-full border-2 border-[#EA4335]" />;
  }
  return <span className="size-1.5 rounded-full bg-[#6E6E73]" />;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelfAttendanceWeekViewProps {
  orgSlug: string;
  memberId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SelfAttendanceWeekView({
  orgSlug,
  memberId,
}: Readonly<SelfAttendanceWeekViewProps>) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const fromStr = format(weekStart, 'yyyy-MM-dd');
  const toStr = format(weekEnd, 'yyyy-MM-dd');

  // ── Data fetching ──────────────────────────────────────────────────
  const { data, isLoading } = useMyAttendanceQuery(orgSlug, memberId, {
    dateFrom: fromStr,
    dateTo: toStr,
    page: 1,
    pageSize: 7,
  });

  const currentYear = today.getFullYear();
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, { year: currentYear });

  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: 'APPROVED',
    memberId,
    fromDate: fromStr,
    toDate: toStr,
    page: 1,
    pageSize: 10,
  });

  // ── Build lookup maps ──────────────────────────────────────────────
  const dayMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of data?.items ?? []) {
      map.set(r.date, r);
    }
    return map;
  }, [data]);

  const holidayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holidays) {
      if (h.isHoliday) {
        map.set(h.holidayDate, h.name);
      }
    }
    return map;
  }, [holidays]);

  const leaveDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const leave of leaveData?.items ?? []) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      let cur = start;
      while (cur <= end) {
        set.add(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
    }
    return set;
  }, [leaveData]);

  // ── Build 7 day rows — today first, then backward through week ────
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayIdx = weekDays.findIndex((d) => format(d, 'yyyy-MM-dd') === todayStr);
  const days = [
    weekDays[todayIdx],
    ...weekDays.slice(0, todayIdx).reverse(),
    ...weekDays.slice(todayIdx + 1).reverse(),
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center border-b border-black/[0.04] bg-canvas/50 py-3">
        <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Date</div>
        <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock In</div>
        <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock Out</div>
        <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Work Time</div>
        <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col bg-surface">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center border-b border-black/4 py-3">
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <Skeleton className="h-3 w-11" />
                <Skeleton className="h-2.5 w-8 mt-0.5" />
              </div>
              <div className="flex-1 flex justify-center">
                <Skeleton className="h-3 w-9" />
              </div>
              <div className="flex-1 flex justify-center">
                <Skeleton className="h-3 w-9" />
              </div>
              <div className="flex-1 flex justify-center">
                <Skeleton className="h-3 w-7" />
              </div>
              <div className="flex-1 flex justify-center">
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col bg-surface">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = dayMap.get(dateStr) ?? null;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const holidayName = holidayNameMap.get(dateStr) ?? null;
            const isLeave = leaveDaySet.has(dateStr);
            const isOff = isWeekend || isLeave || !!holidayName;
            const statusInfo = isLeave ? getStatusInfo(null, true) : record ? getStatusInfo(record.status, false) : null;

            return (
              <div
                key={dateStr}
                className={cn(
                  'flex items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3',
                  isOff && 'bg-red-50/40',
                )}
              >
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-sm font-medium text-neutral-900">
                      {format(day, 'dd MMM')}
                    </span>
                    <span className="text-[11px] text-neutral-400">{DAY_NAMES[day.getDay()]}</span>
                    {holidayName && (
                      <span className="text-[10px] text-red-500 font-medium">{holidayName}</span>
                    )}
                  </div>

                  <div className="flex-1 flex justify-center">
                    <span className="text-sm text-neutral-700">
                      {formatTime(record?.clockIn ?? null) || '—'}
                    </span>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <span className="text-sm text-neutral-700">
                      {formatTime(record?.clockOut ?? null) || '—'}
                    </span>
                  </div>

                  <div className="flex-1 flex justify-center">
                    <span className="text-sm font-semibold text-neutral-900">
                      {record?.totalHours != null ? `${record.totalHours.toFixed(1)}h` : '—'}
                    </span>
                  </div>

                  <div className="flex-1 flex justify-center">
                    {statusInfo ? (
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                        style={{ backgroundColor: `${statusInfo.color}0D`, color: statusInfo.color }}
                      >
                        <StatusDot status={record?.status ?? null} isLeave={isLeave} />
                        {statusInfo.text}
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
    </div>
  );
}
