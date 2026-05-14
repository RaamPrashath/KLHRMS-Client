'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PivotMode = 'weekly' | 'monthly';

interface EmployeeInfo {
  member_id: string;
  name: string;
}

interface AttendancePivotViewProps {
  mode: PivotMode;
  /** ISO date string — first day of the current week (Mon) or month */
  periodStart: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  records: AttendanceRecord[];
  isLoading: boolean;
  showEmployeeColumn: boolean;
  allEmployees?: EmployeeInfo[];
  holidayDates?: Set<string>;
  leaveDates?: Set<string>;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Mon–Sun week containing the given date */
function weekRange(anchor: Date): Date[] {
  const dow = anchor.getDay(); // 0=Sun
  const monday = addDays(anchor, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** All days in the month of the given date */
function monthRange(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
}

function getDays(mode: PivotMode, anchor: Date): Date[] {
  return mode === 'weekly' ? weekRange(anchor) : monthRange(anchor);
}

const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatPeriodLabel(mode: PivotMode, days: Date[]): string {
  if (mode === 'weekly') {
    const first = days[0]!;
    const last = days.at(-1)!;
    const sameYear = first.getFullYear() === last.getFullYear();
    const fmt = (d: Date) =>
      `${MONTH_NAMES[d.getMonth()]!.slice(0, 3)} ${d.getDate()}`;
    const yearSuffix = sameYear ? `, ${first.getFullYear()}` : '';
    return `${fmt(first)} – ${fmt(last)}${yearSuffix}`;
  }
  const d = days[0]!;
  return `${MONTH_NAMES[d.getMonth()]!} ${d.getFullYear()}`;
}

// ─── Data reshaping ───────────────────────────────────────────────────────────

interface EmployeeRow {
  employeeId: string;
  employeeName: string;
  byDate: Map<string, AttendanceRecord>;
  total: number;
}

function buildEmployeeRows(
  records: AttendanceRecord[],
  days: Date[],
  showEmployeeColumn: boolean,
  allEmployees?: EmployeeInfo[],
): EmployeeRow[] {
  const daySet = new Set(days.map(toYMD));
  const map = new Map<string, EmployeeRow>();

  // Org scope: pre-populate rows for ALL employees before overlaying records
  if (allEmployees) {
    for (const emp of allEmployees) {
      map.set(emp.member_id, {
        employeeId: emp.member_id,
        employeeName: emp.name || 'Unknown',
        byDate: new Map(),
        total: 0,
      });
    }
  }

  for (const r of records) {
    if (!daySet.has(r.date)) continue;
    const key = r.employeeId;
    if (!map.has(key)) {
      map.set(key, {
        employeeId: key,
        employeeName: r.employeeName ?? (showEmployeeColumn ? 'Unknown' : 'Me'),
        byDate: new Map(),
        total: 0,
      });
    }
    const row = map.get(key)!;
    row.byDate.set(r.date, r);
    row.total += r.totalHours ?? 0;
  }

  // Self scope: always show at least a "Me" row
  if (map.size === 0 && !showEmployeeColumn) {
    map.set('me', {
      employeeId: 'me',
      employeeName: 'Me',
      byDate: new Map(),
      total: 0,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );
}

// ─── Status color for a cell ──────────────────────────────────────────────────

function cellClass(record: AttendanceRecord | undefined): string {
  if (!record) return 'text-neutral-300';
  if (record.status === 'PRESENT') return 'text-primary font-semibold';
  if (record.status === 'HALF_DAY') return 'text-warning-text font-medium';
  return 'text-destructive-text font-medium';
}

function cellValue(record: AttendanceRecord | undefined): string {
  if (!record) return '–';
  if (record.totalHours == null) return '–';
  return `${record.totalHours.toFixed(1)}h`;
}

function offDayLabel(ymd: string, holidayDates: Set<string>, leaveDates: Set<string>): string | null {
  if (holidayDates.has(ymd)) return 'Holiday';
  if (leaveDates.has(ymd)) return 'Leave';
  return null;
}

// ─── Today highlight ──────────────────────────────────────────────────────────

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function PivotSkeleton({
  colCount,
  showEmployeeColumn,
}: {
  readonly colCount: number;
  readonly showEmployeeColumn: boolean;
}) {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <tr key={i} className="border-b border-neutral-100">
          {showEmployeeColumn && (
            <td className="px-4 py-3 min-w-[180px]">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            </td>
          )}
          {Array.from({ length: colCount }, (_, j) => (
            <td key={j} className="px-3 py-3 text-center">
              <Skeleton className="h-3.5 w-8 mx-auto" />
            </td>
          ))}
          <td className="px-4 py-3 text-right">
            <Skeleton className="h-3.5 w-10 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Employee cell ────────────────────────────────────────────────────────────

const MAX_NAME_CHARS = 20;

function truncateName(name: string): string {
  if (name.length <= MAX_NAME_CHARS) return name;
  return `${name.slice(0, MAX_NAME_CHARS).trimEnd()}…`;
}

function EmployeeCell({ name }: { readonly name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
        {initials}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <span
          className="text-[13px] font-medium text-neutral-900 leading-tight truncate"
          title={name}
        >
          {name}
        </span>
        <span className="text-[11px] text-neutral-400 leading-tight">No Dept</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AttendancePivotView({
  mode,
  periodStart,
  onPrev,
  onNext,
  onToday,
  records,
  isLoading,
  showEmployeeColumn,
  allEmployees,
  holidayDates: holidayDatesProp,
  leaveDates: leaveDatesProp,
}: Readonly<AttendancePivotViewProps>) {
  const anchor = parseYMD(periodStart);
  const days = getDays(mode, anchor);
  const periodLabel = formatPeriodLabel(mode, days);
  const employeeRows = buildEmployeeRows(records, days, showEmployeeColumn, allEmployees);
  const holidayDates = holidayDatesProp ?? new Set<string>();
  const leaveDates = leaveDatesProp ?? new Set<string>();

  // For monthly view, group days into weeks for the header (optional — we just show all days)
  const isMonthly = mode === 'monthly';

  return (
    <div className="flex flex-col">
      {/* ── Period navigator ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-100 bg-canvas/40">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous period"
          className="flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all duration-150 active:scale-95"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        <span className="text-[13px] font-semibold text-neutral-800 min-w-[160px] text-center tabular-nums">
          {periodLabel}
        </span>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next period"
          className="flex items-center justify-center h-7 w-7 rounded-md border border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all duration-150 active:scale-95"
        >
          <ChevronRight className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="ml-1 h-7 px-2.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors duration-150"
        >
          Today
        </button>
      </div>

      {/* ── Pivot table ───────────────────────────────────────────────── */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse" style={{ minWidth: isMonthly ? 900 : 640 }}>
          <thead>
            <tr className="bg-canvas/60 border-b border-neutral-200">
              {/* Employee column header */}
              {showEmployeeColumn && (
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap w-[200px] max-w-[200px] sticky left-0 bg-[#f5f5f7] z-10">
                  Employee
                </th>
              )}

              {/* Date column headers */}
              {days.map((d) => {
                const today = isToday(d);
                return (
                  <th
                    key={toYMD(d)}
                    className={cn(
                      'px-2 py-2.5 text-center whitespace-nowrap',
                      isMonthly ? 'min-w-[52px]' : 'min-w-[72px]',
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider',
                          today ? 'text-primary' : 'text-neutral-500',
                        )}
                      >
                        {`${MONTH_NAMES[d.getMonth()]!.slice(0, 3)} ${d.getDate()}`}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-medium uppercase tracking-widest',
                          today ? 'text-primary/70' : 'text-neutral-400',
                        )}
                      >
                        {DAY_ABBR[d.getDay()]}
                      </span>
                      {today && (
                        <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </div>
                  </th>
                );
              })}

              {/* Total column */}
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100 bg-surface">
            {(() => {
              if (isLoading) {
                return (
                  <PivotSkeleton
                    colCount={days.length}
                    showEmployeeColumn={showEmployeeColumn}
                  />
                );
              }
              if (employeeRows.length === 0) {
                return (
                  <tr>
                    <td
                      colSpan={days.length + (showEmployeeColumn ? 1 : 0) + 1}
                      className="py-16 text-center text-sm text-neutral-400"
                    >
                      No attendance records for this period.
                    </td>
                  </tr>
                );
              }
              return employeeRows.map((row) => (
                <tr
                  key={row.employeeId}
                  className="hover:bg-canvas/60 transition-colors duration-100"
                >
                  {/* Employee cell */}
                  {showEmployeeColumn && (
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-neutral-100 w-[200px] max-w-[200px] overflow-hidden">
                      <EmployeeCell name={row.employeeName} />
                    </td>
                  )}

                  {/* Day cells */}
                  {days.map((d) => {
                    const ymd = toYMD(d);
                    const record = row.byDate.get(ymd);
                    const today = isToday(d);
                    const isOff = holidayDates.has(ymd) || leaveDates.has(ymd);
                    const offLabel = offDayLabel(ymd, holidayDates, leaveDates);
                    return (
                      <td
                        key={ymd}
                        className={cn(
                          'px-2 py-3 text-center text-[13px] tabular-nums',
                          today && 'bg-primary/3',
                          isOff && !record && 'bg-red-50/40',
                        )}
                      >
                        {isOff && !record ? (
                          <span className="text-[11px] font-medium text-red-500">
                            {offLabel}
                          </span>
                        ) : (
                          <span className={cn(cellClass(record), isOff && 'line-through decoration-red-300/40')}>
                            {cellValue(record)}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Total cell */}
                  <td className="px-4 py-3 text-right text-[13px] font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                    {row.total > 0 ? `${row.total.toFixed(1)}h` : '–'}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
