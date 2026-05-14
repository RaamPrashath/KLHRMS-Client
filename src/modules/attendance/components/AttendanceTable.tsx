'use client';

import { useState, useEffect, useMemo } from 'react';
import { List, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttendanceFilters } from '@/modules/attendance/components/AttendanceFilters';
import { AttendanceRow } from '@/modules/attendance/components/AttendanceRow';
import { AttendanceExportButtons } from '@/modules/attendance/components/AttendanceExportButtons';
import { AttendancePivotView, type PivotMode } from '@/modules/attendance/components/AttendancePivotView';
import { SelfAttendanceWeekView } from '@/modules/attendance/components/SelfAttendanceWeekView';
import {
  formatDate,
  formatTime,
  formatHours,
  getTodayIST,
} from '@/modules/attendance/utils/attendanceFormatters';
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
    canEdit,
    canDelete,
    showEmployeeColumn,
    onEdit,
    onDelete,
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
        pageSize: 20,
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

  const items = data?.items ?? [];
  const pageSize = filters.pageSize ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

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

  const columnCount = showEmployeeColumn ? 6 : 5;

  // Fetch all employees for org-scope pivot view
  const { data: employeeData } = useEmployeesQuery(orgSlug, memberId, {
    page: 1,
    pageSize: 200,
  });
  const allEmployees = showEmployeeColumn
    ? (employeeData?.items ?? []).map((e) => ({
        member_id: e.member_id,
        name: e.name,
      }))
    : undefined;

  // Fetch holidays and leaves for pivot views
  const pivotYear = pivotAnchor.getFullYear();
  const pivotMonth = pivotAnchor.getMonth() + 1;
  const { data: pivotHolidays = [] } = useHolidays(orgSlug, memberId, { year: pivotYear, month: pivotMonth });

  const pivotFrom = pivotDateColumns[0] ?? '';
  const pivotTo = pivotDateColumns[pivotDateColumns.length - 1] ?? '';
  const { data: pivotLeaveData } = useLeaveRequests(orgSlug, memberId, {
    status: 'APPROVED',
    fromDate: pivotFrom,
    toDate: pivotTo,
    page: 1,
    pageSize: 200,
  });

  const pivotHolidayDates = useMemo(
    () => new Set(pivotHolidays.filter((h) => h.isHoliday).map((h) => h.holidayDate)),
    [pivotHolidays],
  );

  const pivotLeaveDates = useMemo(() => {
    const set = new Set<string>();
    if (pivotLeaveData?.items) {
      for (const leave of pivotLeaveData.items) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(d.toISOString().split('T')[0]);
        }
      }
    }
    return set;
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

              <div className="mt-2 flex items-center self-start rounded-xl bg-neutral-50 p-1 border border-black/4">
                {VIEW_MODES.map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleViewModeChange(mode)}
                    aria-label={`${label} view`}
                    aria-pressed={viewMode === mode}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg transition-all duration-200 ease-out',
                      viewMode === mode
                        ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        : 'text-neutral-500 hover:text-neutral-900',
                    )}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
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
                return <SelfAttendanceWeekView orgSlug={orgSlug} memberId={memberId} />;
              }

              return (
                <>
                  {/* Header */}
                  <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
                    {showEmployeeColumn && (
                      <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Employee</div>
                    )}
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Date</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock In</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Clock Out</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Work Time</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
                  </div>

                  {/* Body */}
                  <div className="px-4">
                    {isLoading ? (
                      <div className="flex flex-col divide-y divide-black/4 bg-surface">
                        {SKELETON_IDS.slice(0, pageSize).map((id) => (
                          <div key={id} className="border-b border-black/4 p-6">
                            <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                          </div>
                        ))}
                      </div>
                    ) : items.length === 0 ? (
                      <div className="bg-surface py-16 text-center text-sm text-neutral-400">
                        No attendance records found.
                      </div>
                    ) : (
                      <div className="flex flex-col bg-surface">
                        {items.map((record) => (
                          <AttendanceRow
                            key={record.id}
                            record={record}
                            showEmployeeColumn={showEmployeeColumn}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
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
                allEmployees={allEmployees}
                holidayDates={pivotHolidayDates}
                leaveDates={pivotLeaveDates}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
