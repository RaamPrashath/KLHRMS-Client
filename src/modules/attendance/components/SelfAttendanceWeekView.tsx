'use client';

import { useMemo } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyAttendanceQuery } from '@/modules/attendance/hooks/queries/attendance';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { formatTime } from '@/modules/attendance/utils/attendanceFormatters';
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceFiltersState,
} from '@/modules/attendance/types/attendanceTypes';

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

const ALL_TIME_DAY_CAP = 90;

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(d: Date): Date {
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

interface DateRange {
  from: Date;
  to: Date;
}

function resolveDateRange(
  preset: AttendanceFiltersState['timePreset'],
  today: Date,
): DateRange {
  if (preset === 'last_calendar_week') {
    const thisMonday = getMondayOfWeek(today);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(lastSunday.getDate() - 1);
    return { from: lastMonday, to: lastSunday };
  }

  if (preset === 'all_time') {
    const start = new Date(today);
    start.setDate(start.getDate() - (ALL_TIME_DAY_CAP - 1));
    return { from: start, to: today };
  }

  const monday = getMondayOfWeek(today);
  return { from: monday, to: today };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelfAttendanceWeekViewProps {
  orgSlug: string;
  memberId: string;
  filters: AttendanceFiltersState;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SelfAttendanceWeekView({
  orgSlug,
  memberId,
  filters,
}: Readonly<SelfAttendanceWeekViewProps>) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const range = useMemo(() => resolveDateRange(filters.timePreset, today), [filters.timePreset, today]);
  const fromStr = toYmdLocal(range.from);
  const toStr = toYmdLocal(range.to);

  // ── Data fetching ──────────────────────────────────────────────────
  const { data, isLoading } = useMyAttendanceQuery(orgSlug, memberId, {
    dateFrom: fromStr,
    dateTo: toStr,
    page: 1,
    pageSize: 200,
  });

  const currentYear = today.getFullYear();
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, { year: currentYear });

  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: 'APPROVED',
    memberId,
    fromDate: fromStr,
    toDate: toStr,
    page: 1,
    pageSize: 50,
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
      const start = parseISO(leave.startDate);
      const end = parseISO(leave.endDate);
      let cur = start;
      while (cur <= end) {
        set.add(format(cur, 'yyyy-MM-dd'));
        cur = addDays(cur, 1);
      }
    }
    return set;
  }, [leaveData]);

  // ── Enumerate days in the range (descending) ───────────────────────
  const enumeratedDays = useMemo(() => {
    const days: Date[] = [];
    for (let d = new Date(range.to); d >= range.from; d.setDate(d.getDate() - 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [range.from, range.to]);

  // ── Pin today to the top, then keep the rest in descending order ───
  const orderedDays = useMemo(() => {
    const todayIdx = enumeratedDays.findIndex((d) => format(d, 'yyyy-MM-dd') === todayStr);
    if (todayIdx < 0) return enumeratedDays;
    return [
      enumeratedDays[todayIdx]!,
      ...enumeratedDays.slice(0, todayIdx),
      ...enumeratedDays.slice(todayIdx + 1),
    ];
  }, [enumeratedDays, todayStr]);

  // ── Hide Saturday & Sunday unless the user clocked in ──────────────
  const visibleDays = useMemo(() => {
    return orderedDays.filter((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      if (!isWeekend) return true;
      return dayMap.has(dateStr);
    });
  }, [orderedDays, dayMap]);

  const filteredVisibleDays = useMemo(() => {
    return visibleDays.filter((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const record = dayMap.get(dateStr) ?? null;
      const isLeave = leaveDaySet.has(dateStr);

      if (filters.status) {
        const status = isLeave ? 'ABSENT' : record?.status;
        if (status !== filters.status) return false;
      }

      if (filters.employeeNameSearch) {
        const query = filters.employeeNameSearch.toLowerCase();
        const workdayLabel = `${DAY_NAMES[d.getDay()]} Workday`.toLowerCase();
        const holidayName = holidayNameMap.get(dateStr)?.toLowerCase() ?? '';
        const description = record?.description?.toLowerCase() ?? '';
        if (
          !workdayLabel.includes(query) &&
          !holidayName.includes(query) &&
          !description.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [visibleDays, dayMap, leaveDaySet, filters.status, filters.employeeNameSearch, holidayNameMap]);

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block w-full overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="flex items-center border-b border-black/[0.04] dark:border-white/[0.04] bg-canvas/50 py-3">
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Date</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock In</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock Out</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Work Time</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex flex-col bg-surface">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center border-b border-black/4 py-3 animate-pulse">
                  <div className="flex-1 flex flex-col items-center gap-0.5">
                    <Skeleton className="h-3 w-11 bg-neutral-200 dark:bg-zinc-800" />
                    <Skeleton className="h-2.5 w-8 mt-0.5 bg-neutral-100 dark:bg-zinc-900" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <Skeleton className="h-3 w-9 bg-neutral-100 dark:bg-zinc-900" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <Skeleton className="h-3 w-9 bg-neutral-100 dark:bg-zinc-900" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <Skeleton className="h-3 w-7 bg-neutral-100 dark:bg-zinc-900" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <Skeleton className="h-5 w-12 rounded-full bg-neutral-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVisibleDays.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-400">
              No attendance records found.
            </div>
          ) : (
            <div className="flex flex-col bg-surface">
              {filteredVisibleDays.map((day) => {
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
                      isOff && 'bg-red-50/40 dark:bg-red-950/10',
                    )}
                  >
                    <div className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {format(day, 'dd MMM')}
                      </span>
                      <span className="text-[11px] text-neutral-400">{DAY_NAMES[day.getDay()]}</span>
                      {holidayName && (
                        <span className="text-[10px] text-red-500 font-medium">{holidayName}</span>
                      )}
                    </div>

                    <div className="flex-1 flex justify-center">
                      <span className="text-sm text-neutral-700 dark:text-zinc-350">
                        {formatTime(record?.clockIn ?? null) || '—'}
                      </span>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <span className="text-sm text-neutral-700 dark:text-zinc-355">
                        {formatTime(record?.clockOut ?? null) || '—'}
                      </span>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
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
      </div>

      {/* Mobile Stacked Card List View */}
      <div className="block md:hidden w-full space-y-2.5 p-4 bg-surface dark:bg-zinc-950 rounded-b-2xl">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block pl-1">
          Attendance Ledger
        </span>

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-neutral-200/70 dark:border-zinc-800/70 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-neutral-100 dark:bg-zinc-800 w-10 h-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-neutral-200 dark:bg-zinc-750 rounded" />
                    <div className="h-3 w-32 bg-neutral-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-neutral-100 dark:bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredVisibleDays.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No attendance records found.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredVisibleDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const record = dayMap.get(dateStr) ?? null;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const holidayName = holidayNameMap.get(dateStr) ?? null;
              const isLeave = leaveDaySet.has(dateStr);
              const isActive = record && record.clockIn != null && record.clockOut == null && dateStr === todayStr;

              // Render correct date icon styling
              let dateIconClass = "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-200/40 dark:border-zinc-850/30";
              if (isActive || (record && record.status === 'PRESENT')) {
                dateIconClass = "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/30";
              } else if (isLeave || (record && record.status === 'ABSENT')) {
                dateIconClass = "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/60 dark:border-rose-900/30";
              } else if (record && record.status === 'HALF_DAY') {
                dateIconClass = "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/60 dark:border-amber-900/30";
              }

              // Card title
              let cardTitle = `${DAY_NAMES[day.getDay()]} Workday`;
              if (holidayName) {
                cardTitle = holidayName;
              } else if (isWeekend) {
                cardTitle = DAY_NAMES[day.getDay()]!;
              }

              return (
                <div
                  key={dateStr}
                  className="bg-white dark:bg-zinc-900 border border-neutral-200/70 dark:border-zinc-800/70 rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 select-none", dateIconClass)}>
                      <span className="text-xs font-extrabold leading-none">{format(day, 'dd')}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-80 mt-0.5">{format(day, 'MMM')}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{cardTitle}</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-zinc-500 font-medium">
                        <span className="text-neutral-700 dark:text-zinc-300 font-mono">{formatTime(record?.clockIn ?? null) || '—'}</span> In
                        <span className="text-neutral-300 dark:text-zinc-700">•</span>
                        <span className="text-neutral-700 dark:text-zinc-300 font-mono">{formatTime(record?.clockOut ?? null) || '—'}</span> Out
                      </div>
                    </div>
                  </div>

                  {/* Right Status Badge */}
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" /> Active
                    </span>
                  ) : isLeave ? (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/40 dark:border-rose-900/30 shrink-0">
                      On Leave
                    </span>
                  ) : holidayName ? (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/40 dark:border-sky-900/30 shrink-0">
                      Holiday
                    </span>
                  ) : record ? (
                    record.status === 'PRESENT' ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30 shrink-0">
                        Present {record.totalHours != null ? `(${record.totalHours.toFixed(1)}h)` : ''}
                      </span>
                    ) : record.status === 'HALF_DAY' ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 shrink-0">
                        Half Day {record.totalHours != null ? `(${record.totalHours.toFixed(1)}h)` : ''}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/40 dark:border-rose-900/30 shrink-0">
                        Absent
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-500 border border-neutral-200/30 dark:border-zinc-800/30 shrink-0">
                      No Entry
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
