'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { List, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AttendanceFilters } from '@/modules/attendance/components/AttendanceFilters';
import { AttendanceRow } from '@/modules/attendance/components/AttendanceRow';
import { AttendanceExportButtons } from '@/modules/attendance/components/AttendanceExportButtons';
import { EmployeePagination } from '@/modules/employees/components/EmployeePagination';
import { AttendancePivotView, type PivotMode } from '@/modules/attendance/components/AttendancePivotView';
import { SelfAttendanceWeekView } from '@/modules/attendance/components/SelfAttendanceWeekView';

import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import { fetchHolidaysAction } from '@/modules/leave/api/leaveServerActions';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import type {
  AttendanceRecord,
  AttendanceListResponse,
  AttendanceFiltersState,
} from '@/modules/attendance/types/attendanceTypes';
import type { AttendanceExportRow } from '@/modules/attendance/api/attendanceServerActions';

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'weekly' | 'monthly';

// ─── Date helpers for pivot period navigation ─────────────────────────────────

function toYMD(d: Date): string {
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

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function leaveKey(employeeId: string, date: string): string {
  return `${employeeId}:${date}`;
}

function getPivotRange(mode: PivotMode, anchor: Date): [string, string] {
  if (mode === 'weekly') {
    const monday = getMondayOfWeek(anchor);
    const sunday = addDays(monday, 6);
    return [toYMD(monday), toYMD(sunday)];
  }
  const start = getMonthStart(anchor);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return [toYMD(start), toYMD(end)];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttendanceTableProps {
  orgSlug: string;
  memberId: string;
  data: AttendanceListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  canEdit: boolean;
  canDelete: boolean;
  showEmployeeColumn: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

// ─── View mode toggle ─────────────────────────────────────────────────────────

const VIEW_MODES: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'list',    icon: <List className="size-3.5" />,         label: 'List' },
  { mode: 'weekly',  icon: <CalendarDays className="size-3.5" />, label: 'Week' },
  { mode: 'monthly', icon: <CalendarRange className="size-3.5" />, label: 'Month' },
];

interface AttendanceListRow {
  key: string;
  date: string;
  employeeId: string;
  employeeName: string;
  record: AttendanceRecord | null;
}

function parseYmd(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function toYear(date: string): number {
  return Number(date.slice(0, 4));
}

function enumerateDatesDesc(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = parseYmd(to);
  const end = parseYmd(from);
  while (cursor >= end) {
    dates.push(toYMD(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

function getYearsInRange(from: string, to: string): number[] {
  const start = toYear(from);
  const end = toYear(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const LIST_HOLIDAY_FETCH_SIZE = 200;

// ─── Tab slider ───────────────────────────────────────────────────────────────

function TabSlider({
  activeMode,
  onChange,
}: {
  readonly activeMode: ViewMode;
  readonly onChange: (mode: ViewMode) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = VIEW_MODES.findIndex((m) => m.mode === activeMode);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="mt-2 flex items-center self-start rounded-xl bg-neutral-50 p-1 border border-black/4 relative"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {VIEW_MODES.map(({ mode, icon, label }, idx) => (
        <button
          key={mode}
          data-tab-index={idx}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={`${label} view`}
          aria-pressed={activeMode === mode}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
            activeMode === mode
              ? 'text-primary'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AttendanceTable(props: Readonly<AttendanceTableProps>) {
  const {
    orgSlug,
    memberId,
    data,
    isLoading,
    isError,
    onRetry,
    filters,
    onFiltersChange,
    showEmployeeColumn,
  } = props;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [pivotAnchor, setPivotAnchor] = useState<Date>(() => new Date());

  useEffect(() => {
    if (viewMode === 'list') return;
    const [from, to] = getPivotRange(viewMode as PivotMode, pivotAnchor);
    onFiltersChange({
      ...filters,
      timePreset: 'custom',
      dateFrom: from,
      dateTo: to,
      page: 1,
      pageSize: 200,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pivotAnchor]);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    if (mode === 'list') {
      onFiltersChange({
        ...filters,
        timePreset: 'all_time',
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
        pageSize: 50,
      });
    }
  }

  function handlePrev() {
    setPivotAnchor((prev) =>
      viewMode === 'weekly' ? addDays(prev, -7) : addMonths(prev, -1),
    );
  }

  function handleNext() {
    setPivotAnchor((prev) =>
      viewMode === 'weekly' ? addDays(prev, 7) : addMonths(prev, 1),
    );
  }

  function handleToday() {
    setPivotAnchor(new Date());
  }

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const pageSize = filters.pageSize ?? 15;
  const today = getTodayIST();
  const currentPage = filters.page ?? 1;

  const exportRows: AttendanceExportRow[] = items.map((r) => ({
    id: r.id,
    date: r.date,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    totalHours: r.totalHours,
    status: r.status,
    employeeName: r.employeeName ?? null,
  }));

  const presetLabels: Record<string, string> = {
    today: 'Today', yesterday: 'Yesterday',
    this_week: 'This Week', last_calendar_week: 'Last Week',
    last_week: 'Last 7 Days', last_month: 'Last 30 Days',
    all_time: 'All Time', custom: 'Custom Range',
  };
  const exportTitle = `Attendance Report — ${presetLabels[filters.timePreset] ?? 'Report'}`;

  const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function getPivotDateColumns(): string[] {
    if (viewMode === 'weekly') {
      const monday = getMondayOfWeek(pivotAnchor);
      return Array.from({ length: 7 }, (_, i) => toYMD(addDays(monday, i)));
    }
    const daysInMonth = new Date(pivotAnchor.getFullYear(), pivotAnchor.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(pivotAnchor.getFullYear(), pivotAnchor.getMonth(), i + 1);
      return toYMD(d);
    });
  }

  function getPivotPeriodLabel(): string {
    if (viewMode === 'weekly') {
      const monday = getMondayOfWeek(pivotAnchor);
      const sunday = addDays(monday, 6);
      const fmt = (d: Date) => `${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`;
      return `${fmt(monday)} – ${fmt(sunday)}, ${monday.getFullYear()}`;
    }
    return `${MONTH_NAMES_SHORT[pivotAnchor.getMonth()]} ${pivotAnchor.getFullYear()}`;
  }

  const isPivot = viewMode !== 'list';
  const pivotDateColumns = isPivot ? getPivotDateColumns() : [];
  const pivotPeriodLabel = isPivot ? getPivotPeriodLabel() : '';
  const pivotExportTitle = isPivot
    ? `Attendance — ${getPivotPeriodLabel()}`
    : exportTitle;

  const pivotPeriodStart = toYMD(
    viewMode === 'weekly'
      ? getMondayOfWeek(pivotAnchor)
      : getMonthStart(pivotAnchor),
  );


  // Fetch all employees for org-scope pivot view
  const { data: employeeData } = useEmployeesQuery(orgSlug, memberId, {
    page: 1,
    pageSize: 200,
  }, {
    enabled: showEmployeeColumn,
  });
  const allEmployees = showEmployeeColumn
    ? (employeeData?.items ?? []).map((e) => ({
        member_id: e.member_id,
        name: e.name,
      }))
    : undefined;

  const dateEmployeeMap = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceRecord>>();
    for (const r of items) {
      if (!map.has(r.date)) map.set(r.date, new Map());
      map.get(r.date)!.set(r.employeeId, r);
    }
    return map;
  }, [items]);

  const sortedDates = useMemo(() => {
    const recordDates = Array.from(dateEmployeeMap.keys()).filter((d) => d <= today);
    const oldestRecordDate = recordDates.sort((a, b) => a.localeCompare(b))[0];
    const rangeEnd = filters.dateTo && filters.dateTo <= today ? filters.dateTo : today;
    const rangeStart = filters.dateFrom ?? oldestRecordDate ?? rangeEnd;
    if (rangeStart > rangeEnd) return [];
    return enumerateDatesDesc(rangeStart, rangeEnd);
  }, [dateEmployeeMap, filters.dateFrom, filters.dateTo, today]);

  const sortedEmployeeList = useMemo(() => {
    if (!allEmployees || allEmployees.length === 0) return [];
    let list = [...allEmployees];
    if (filters.employeeNameSearch) {
      const q = filters.employeeNameSearch.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmployees, filters.employeeNameSearch]);

  const listHolidayYears = useMemo(() => {
    const firstDate = sortedDates.at(-1);
    const lastDate = sortedDates[0];
    if (!firstDate || !lastDate) return [];
    return getYearsInRange(firstDate, lastDate);
  }, [sortedDates]);

  const listHolidayQueries = useQueries({
    queries: listHolidayYears.map((year) => ({
      queryKey: ['leave-holidays', orgSlug, year, 'attendance-list'],
      queryFn: async () => {
        const res = await fetchHolidaysAction({
          orgSlug,
          memberId,
          year,
          pageSize: LIST_HOLIDAY_FETCH_SIZE,
        });
        return res.items;
      },
      enabled: !!orgSlug && !!memberId && viewMode === 'list' && showEmployeeColumn,
      staleTime: 60_000,
    })),
  });

  const listHolidayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const query of listHolidayQueries) {
      for (const holiday of query.data ?? []) {
        if (holiday.isHoliday) {
          map.set(holiday.holidayDate, holiday.name);
        }
      }
    }
    return map;
  }, [listHolidayQueries]);

  const listRows = useMemo<AttendanceListRow[]>(() => {
    if (!allEmployees || allEmployees.length === 0) return [];

    return sortedDates.flatMap((date) =>
      sortedEmployeeList
        .filter((emp) => {
          if (!filters.status) return true;
          const record = dateEmployeeMap.get(date)?.get(emp.member_id);
          return record && record.status === filters.status;
        })
        .map((emp) => {
          const record = dateEmployeeMap.get(date)?.get(emp.member_id) ?? null;
          return {
            key: `${date}:${emp.member_id}`,
            date,
            employeeId: emp.member_id,
            employeeName: emp.name,
            record,
          };
        }),
    );
  }, [allEmployees, dateEmployeeMap, filters.status, sortedDates, sortedEmployeeList]);

  const totalListRows = listRows.length;
  const totalPages = Math.max(1, Math.ceil(totalListRows / pageSize));
  const pagedListRows = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return listRows.slice(start, start + pageSize);
  }, [currentPage, listRows, pageSize, totalPages]);

  useEffect(() => {
    if (viewMode !== 'list' || currentPage <= totalPages) return;
    onFiltersChange({ ...filters, page: totalPages });
  }, [currentPage, filters, onFiltersChange, totalPages, viewMode]);

  // Fetch holidays and leaves for pivot views
  const pivotYear = pivotAnchor.getFullYear();
  const { data: pivotHolidays = [] } = useHolidays(orgSlug, memberId, { year: pivotYear });

  const pivotFrom = pivotDateColumns[0] ?? '';
  const pivotTo = pivotDateColumns[pivotDateColumns.length - 1] ?? '';
  const { data: pivotLeaveData } = useLeaveRequests(orgSlug, memberId, {
    status: 'APPROVED',
    fromDate: pivotFrom,
    toDate: pivotTo,
    page: 1,
    pageSize: 200,
  });

  const pivotHolidayNames = useMemo(
    () => new Map(pivotHolidays.filter((h) => h.isHoliday).map((h) => [h.holidayDate, h.name])),
    [pivotHolidays],
  );

  const pivotLeaveNames = useMemo(() => {
    const map = new Map<string, string>();
    if (pivotLeaveData?.items) {
      for (const leave of pivotLeaveData.items) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          map.set(leaveKey(leave.memberId, toYMD(d)), leave.leaveType.name);
        }
      }
    }
    return map;
  }, [pivotLeaveData]);

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* ── Top section: title + view toggle + export + filters ───────── */}
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">
                Attendance Records
              </h2>

              <TabSlider
                activeMode={viewMode}
                onChange={handleViewModeChange}
              />
            </div>

            <div className="shrink-0">
              <AttendanceExportButtons
                orgSlug={orgSlug}
                memberId={memberId}
                records={exportRows}
                showEmployeeColumn={showEmployeeColumn}
                title={pivotExportTitle}
                disabled={isLoading || isError}
                viewMode={viewMode}
                pivotRecords={items}
                pivotDateColumns={pivotDateColumns}
                pivotPeriodLabel={pivotPeriodLabel}
              />
            </div>
          </div>

          {viewMode === 'list' && (
            <AttendanceFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              showMemberFilter={showEmployeeColumn}
              selfScope={!showEmployeeColumn}
            />
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="w-full">
          {(() => {
            if (isError) {
              return (
                <div className="flex flex-col items-center justify-center gap-3 py-16 bg-surface">
                  <p className="text-sm font-medium text-neutral-900">
                    Failed to load attendance records
                  </p>
                  <p className="text-xs text-neutral-500 max-w-[250px] text-center">
                    There was a problem retrieving the data. Please try again.
                  </p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-sm font-normal bg-transparent border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-md transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              );
            }

            if (viewMode === 'list') {
              // Self-scope: show week-based view instead of paginated list
              if (!showEmployeeColumn) {
                return <SelfAttendanceWeekView orgSlug={orgSlug} memberId={memberId} filters={filters} />;
              }

              return (
                <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse bg-surface table-fixed">
                  <colgroup>
                    {showEmployeeColumn && <col className="w-[28%]" style={{ minWidth: 180 }} />}
                    <col style={{ minWidth: 110 }} />
                    <col style={{ minWidth: 100 }} />
                    <col style={{ minWidth: 100 }} />
                    <col style={{ minWidth: 90 }} />
                    <col style={{ minWidth: 110 }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-black/[0.04] bg-canvas/50">
                      {showEmployeeColumn && (
                        <th className="text-left pl-6 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Employee</th>
                      )}
                      <th className="text-center py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                      <th className="text-center py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock In</th>
                      <th className="text-center py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock Out</th>
                      <th className="text-center py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Work Time</th>
                      <th className="text-center py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      SKELETON_IDS.slice(0, pageSize).map((id) => (
                        <tr key={id} className="border-b border-black/4">
                          <td className="pl-6 py-3">
                            <Skeleton className="h-3 w-14" />
                          </td>
                          <td className="text-center py-3">
                            <Skeleton className="h-3 w-12 mx-auto" />
                          </td>
                          <td className="text-center py-3">
                            <Skeleton className="h-3 w-10 mx-auto" />
                          </td>
                          <td className="text-center py-3">
                            <Skeleton className="h-3 w-10 mx-auto" />
                          </td>
                          <td className="text-center py-3">
                            <Skeleton className="h-3 w-7 mx-auto" />
                          </td>
                          <td className="text-center py-3">
                            <Skeleton className="h-5 w-12 rounded-full mx-auto" />
                          </td>
                        </tr>
                      ))
                    ) : items.length === 0 && (!allEmployees || allEmployees.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-sm text-neutral-400">
                          No attendance records found.
                        </td>
                      </tr>
                    ) : allEmployees && allEmployees.length > 0 ? (
                      pagedListRows.map((row) => (
                        <AttendanceRow
                          key={row.key}
                          record={row.record}
                          employeeName={row.employeeName}
                          date={row.date}
                          holidayName={listHolidayNames.get(row.date)}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-sm text-neutral-400">
                          Loading employees…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                  <div className="px-6 py-4 border-t border-black/[0.04]">
                    <EmployeePagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={totalListRows}
                      pageSize={pageSize}
                      onPageChange={(p) => onFiltersChange({ ...filters, page: p })}
                      onPageSizeChange={(s) => onFiltersChange({ ...filters, page: 1, pageSize: s })}
                    />
                  </div>
                </div>
              );
            }

            return (
              <AttendancePivotView
                mode={viewMode}
                periodStart={pivotPeriodStart}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                records={items}
                isLoading={isLoading}
                showEmployeeColumn={showEmployeeColumn}
                currentMemberId={memberId}
                allEmployees={allEmployees}
                holidayNames={pivotHolidayNames}
                leaveNames={pivotLeaveNames}
              />
            );
          })()}
        </div>
      </div>

    </div>
  );
}
