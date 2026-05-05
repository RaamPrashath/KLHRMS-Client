'use client';

import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { List, CalendarDays, CalendarRange } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AttendanceFilters } from '@/modules/attendance/components/AttendanceFilters';
import { AttendanceRow } from '@/modules/attendance/components/AttendanceRow';
import { AttendanceEmptyState } from '@/modules/attendance/components/AttendanceEmptyState';
import { AttendanceExportButtons } from '@/modules/attendance/components/AttendanceExportButtons';
import { AttendancePivotView, type PivotMode } from '@/modules/attendance/components/AttendancePivotView';
import {
  formatDate,
  formatTime,
  formatHours,
  getTodayIST,
} from '@/modules/attendance/utils/attendanceFormatters';import type {
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

/** Returns [periodStart, periodEnd] as YMD strings for the pivot period */
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

const columnHelper = createColumnHelper<AttendanceRecord>();
const SKELETON_IDS = Array.from({ length: 20 }, (_, i) => `skeleton-row-${i}`);

// ─── List table body ──────────────────────────────────────────────────────────

interface BodyProps {
  isLoading: boolean;
  items: AttendanceRecord[];
  pageSize: number;
  columnCount: number;
  canEdit: boolean;
  canDelete: boolean;
  showEmployeeColumn: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}

function TableBody({
  isLoading,
  items,
  pageSize,
  columnCount,
  canEdit,
  canDelete,
  showEmployeeColumn,
  onEdit,
  onDelete,
}: Readonly<BodyProps>) {
  if (isLoading) {
    return (
      <>
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <tr key={id} className="border-b border-neutral-100">
            {Array.from({ length: columnCount }, (_, j) => (
              <td key={j} className="px-4 py-2">
                <Skeleton className="h-4 w-full" />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={columnCount}>
          <AttendanceEmptyState />
        </td>
      </tr>
    );
  }

  return (
    <>
      {items.map((record) => (
        <AttendanceRow
          key={record.id}
          record={record}
          canEdit={canEdit}
          canDelete={canDelete}
          showEmployeeColumn={showEmployeeColumn}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

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

  // ── View mode state ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Pivot anchor — the "current" week/month being viewed
  const [pivotAnchor, setPivotAnchor] = useState<Date>(() => new Date());

  // ── When switching to pivot mode, update filters to fetch the full period ────
  useEffect(() => {
    if (viewMode === 'list') return;
    const [from, to] = getPivotRange(viewMode as PivotMode, pivotAnchor);
    onFiltersChange({
      ...filters,
      timePreset: 'custom',
      dateFrom: from,
      dateTo: to,
      page: 1,
      pageSize: 200, // fetch all records for the period
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pivotAnchor]);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    if (mode === 'list') {
      // Restore sensible list defaults
      const today = getTodayIST();
      onFiltersChange({
        ...filters,
        timePreset: 'today',
        dateFrom: today,
        dateTo: today,
        page: 1,
        pageSize: 20,
      });
    }
  }

  // ── Pivot navigation ─────────────────────────────────────────────────────────
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

  // ── List view data ───────────────────────────────────────────────────────────
  const items = data?.items ?? [];
  const pageSize = filters.pageSize ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  // Export rows — always from visible items
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

  // ── Pivot export helpers ─────────────────────────────────────────────────────
  // Compute the ordered date columns and period label for the current pivot view
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

  // ── List columns ─────────────────────────────────────────────────────────────
  const columns = [
    ...(showEmployeeColumn
      ? [columnHelper.accessor('employeeName', {
          header: 'Employee',
          cell: (info) => info.getValue() ?? '—',
        })]
      : []),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('clockIn', {
      header: 'Clock In',
      cell: (info) => formatTime(info.getValue()),
    }),
    columnHelper.accessor('clockOut', {
      header: 'Clock Out',
      cell: (info) => formatTime(info.getValue()),
    }),
    columnHelper.accessor('totalHours', {
      header: 'Total Hrs',
      cell: (info) => formatHours(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => info.getValue(),
    }),
    ...(canEdit || canDelete
      ? [columnHelper.display({ id: 'actions', header: 'Actions' })]
      : []),
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const tableDescription = showEmployeeColumn
    ? "All employees' attendance records for your organization."
    : 'Detailed breakdown of your daily time logs and status.';

  // Pivot period start for the pivot view
  const pivotPeriodStart = toYMD(
    viewMode === 'weekly'
      ? getMondayOfWeek(pivotAnchor)
      : getMonthStart(pivotAnchor),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-neutral-200 rounded-2xl shadow-(--shadow-1) overflow-hidden flex flex-col transition-all duration-200 hover:shadow-(--shadow-2)">

        {/* ── Table header ──────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-surface flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            {/* Title + view toggle */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
                  {showEmployeeColumn ? 'Team Attendance' : 'Attendance Records'}
                </h2>

                {/* View mode toggle */}
                <div className="flex items-center rounded-lg border border-neutral-200 bg-canvas/60 p-0.5 gap-0.5">
                  {VIEW_MODES.map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleViewModeChange(mode)}
                      aria-label={`${label} view`}
                      aria-pressed={viewMode === mode}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-6 px-2.5 text-[11px] font-medium rounded-md transition-all duration-150',
                        viewMode === mode
                          ? 'bg-surface text-neutral-900 shadow-sm border border-neutral-200'
                          : 'text-neutral-500 hover:text-neutral-700',
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-neutral-500">{tableDescription}</p>
            </div>

            {/* Export buttons */}
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

          {/* Filters — only shown in list mode */}
          {viewMode === 'list' && (
            <AttendanceFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              showMemberFilter={showEmployeeColumn}
            />
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        {(() => {
          if (isError) {
            return (
              <div className="p-12 flex flex-col items-center justify-center gap-3 bg-canvas/30">
                <div className="size-10 rounded-full bg-destructive-bg flex items-center justify-center mb-2">
                  <span className="text-destructive-text font-medium">!</span>
                </div>
                <p className="text-sm font-medium text-neutral-900">
                  Failed to load attendance records
                </p>
                <p className="text-xs text-neutral-500 max-w-[250px] text-center mb-2">
                  There was a problem retrieving the data. Please try again.
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-xs font-medium bg-surface border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-md shadow-sm transition-all"
                >
                  Retry Connection
                </button>
              </div>
            );
          }

          if (viewMode === 'list') {
            return (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-canvas/50">
                      {table.getHeaderGroups().map((headerGroup) =>
                        headerGroup.headers.map((header, i) => (
                          <th
                            key={header.id}
                            className={`text-xs font-semibold font-sans text-neutral-500 uppercase tracking-wider px-6 py-3.5 border-b border-neutral-200 ${
                              i === 0 ? 'pl-6' : ''
                            } ${i === headerGroup.headers.length - 1 ? 'pr-6' : ''}`}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-surface">
                    <TableBody
                      isLoading={isLoading}
                      items={items}
                      pageSize={pageSize}
                      columnCount={columns.length}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      showEmployeeColumn={showEmployeeColumn}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </tbody>
                </table>
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
            />
          );
        })()}

        {/* ── Pagination — list mode only ───────────────────────────────── */}
        {!isError && viewMode === 'list' && (
          <div className="px-6 py-4 border-t border-neutral-100 bg-canvas/30 flex items-center justify-between">
            <p className="text-[13px] text-neutral-500 font-medium">
              Page{' '}
              <span className="text-neutral-900 font-semibold">{currentPage}</span>{' '}
              of{' '}
              <span className="text-neutral-900 font-semibold">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, page: currentPage - 1 })}
                disabled={currentPage <= 1 || isLoading}
                className="inline-flex items-center justify-center text-xs font-medium h-8 px-3 rounded-md bg-surface border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200 active:scale-[0.98]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, page: currentPage + 1 })}
                disabled={currentPage >= totalPages || isLoading}
                className="inline-flex items-center justify-center text-xs font-medium h-8 px-3 rounded-md bg-surface border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200 active:scale-[0.98]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
