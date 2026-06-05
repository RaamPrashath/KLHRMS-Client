'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMemberPermissionsQuery } from '@/modules/attendance/hooks/queries/attendance';
import { formatDate, formatHours } from '@/modules/attendance/utils/attendanceFormatters';
import { exportAttendanceReportAction } from '@/modules/attendance-report/api';
import {
  useAttendanceReportOptionsQuery,
  useAttendanceReportQuery,
} from '@/modules/attendance-report/hooks';
import type {
  AttendanceReportExportFormat,
  AttendanceReportEmployeeOption,
  AttendanceReportFilters,
  AttendanceReportRow,
} from '@/modules/attendance-report/types';

type PeriodMode = 'weekly' | 'monthly' | 'custom';
type ViewMode = 'report' | 'timesheet';

interface AttendanceReportPageShellProps {
  orgSlug: string;
  memberId: string;
}

const ALL_PROJECTS = 'all';
const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseYMD(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function daysBetween(dateFrom: string, dateTo: string): Date[] {
  const start = parseYMD(dateFrom);
  const end = parseYMD(dateTo);
  const days: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

function periodLabel(mode: PeriodMode, dateFrom: string, dateTo: string): string {
  const start = parseYMD(dateFrom);
  const end = parseYMD(dateTo);
  if (mode === 'monthly') {
    return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  const startLabel = `${MONTHS[start.getMonth()]?.slice(0, 3)} ${start.getDate()}`;
  const endLabel = `${MONTHS[end.getMonth()]?.slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
  return `${startLabel} - ${endLabel}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function groupByEmployee(rows: AttendanceReportRow[]) {
  const map = new Map<string, { employee: AttendanceReportRow; rows: AttendanceReportRow[]; total: number }>();
  for (const row of rows) {
    if (!map.has(row.employeeId)) {
      map.set(row.employeeId, { employee: row, rows: [], total: 0 });
    }
    const group = map.get(row.employeeId)!;
    group.rows.push(row);
    group.total += row.totalHours ?? 0;
  }
  return Array.from(map.values()).sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportTitle(viewMode: ViewMode, periodMode: PeriodMode, dateFrom: string, dateTo: string): string {
  const label = periodLabel(periodMode, dateFrom, dateTo);
  if (viewMode === 'timesheet' && periodMode === 'monthly') {
    const start = parseYMD(dateFrom);
    return `${start.getFullYear()}-${MONTHS[start.getMonth()]!.slice(0, 3).toUpperCase()} MONTHLY REPORT`;
  }
  if (viewMode === 'timesheet') return `Timesheet - ${label}`;
  if (periodMode === 'monthly') return `Monthly Report - ${label}`;
  return `Weekly Report - ${label}`;
}

function exportFileName(viewMode: ViewMode, periodMode: PeriodMode, dateFrom: string, format: AttendanceReportExportFormat): string {
  const start = parseYMD(dateFrom);
  const stamp =
    periodMode === 'monthly'
      ? `${start.getFullYear()}-${MONTHS[start.getMonth()]!.slice(0, 3).toUpperCase()}`
      : dateFrom;
  return `${viewMode}-${periodMode}-${stamp}.${format}`;
}

function normalizeScope(value: string | undefined): string {
  return value === 'org' ? 'organization' : value ?? 'none';
}

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'report', label: 'Report' },
  { mode: 'timesheet', label: 'Timesheet' },
];

const PERIOD_MODES: { mode: PeriodMode; label: string }[] = [
  { mode: 'weekly', label: 'Weekly' },
  { mode: 'monthly', label: 'Monthly' },
  { mode: 'custom', label: 'Custom' },
];

function TabSlider<T extends string>({
  modes,
  activeMode,
  onChange,
}: {
  modes: { mode: T; label: string }[];
  activeMode: T;
  onChange: (mode: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = modes.findIndex((m) => m.mode === activeMode);

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
      className="flex items-center self-start rounded-xl bg-neutral-50 p-1 border border-black/4 relative"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {modes.map(({ mode, label }, idx) => (
        <button
          key={mode}
          data-tab-index={idx}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={activeMode === mode}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
            activeMode === mode
              ? 'text-[#00874A]'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EmployeeCell({
  name,
  detail,
}: {
  name: string;
  detail?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-bg text-xs font-semibold text-info-text">
        {initials(name) || 'E'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
        <p className="truncate text-xs text-neutral-500">{detail || 'No Dept'}</p>
      </div>
    </div>
  );
}

function ReportTable({
  rows,
  isLoading,
  selectedEmployeeIds,
  onToggleEmployee,
  onToggleManyEmployees,
}: {
  rows: AttendanceReportRow[];
  isLoading: boolean;
  selectedEmployeeIds: string[];
  onToggleEmployee: (employeeId: string, checked: boolean) => void;
  onToggleManyEmployees: (employeeIds: string[], checked: boolean) => void;
}) {
  const groups = groupByEmployee(rows);
  const selectedSet = new Set(selectedEmployeeIds);
  const visibleEmployeeIds = groups.map((group) => group.employee.employeeId);
  const visibleSelectedCount = visibleEmployeeIds.filter((id) => selectedSet.has(id)).length;
  const allVisibleSelected = visibleEmployeeIds.length > 0 && visibleSelectedCount === visibleEmployeeIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const selectAllState: boolean | 'indeterminate' = allVisibleSelected
    ? true
    : someVisibleSelected
      ? 'indeterminate'
      : false;
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-b-xl bg-neutral-50" />;
  }
  if (groups.length === 0) {
    return <div className="py-16 text-center text-sm text-neutral-500">No report rows match the current filters.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 bg-canvas">
            <th className="w-[52px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <Checkbox
                checked={selectAllState}
                onCheckedChange={(value) => onToggleManyEmployees(visibleEmployeeIds, value === true)}
                aria-label="Select all visible employees"
              />
            </th>
            <th className="w-[280px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Employee</th>
            <th className="w-[170px] border-r border-neutral-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
            <th className="border-r border-neutral-100 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</th>
            <th className="w-[120px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Hours</th>
            <th className="w-[150px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Period Total</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {groups.map((group) =>
            group.rows.map((row, index) => (
              <tr key={row.attendanceRecordId} className="border-b border-neutral-100 hover:bg-canvas/60">
                {index === 0 && (
                  <td rowSpan={group.rows.length} className="border-r border-neutral-100 px-4 py-3 align-middle">
                    <Checkbox
                      checked={selectedSet.has(group.employee.employeeId)}
                      onCheckedChange={(value) => onToggleEmployee(group.employee.employeeId, value === true)}
                      aria-label={`Toggle ${group.employee.employeeName}`}
                    />
                  </td>
                )}
                {index === 0 && (
                  <td rowSpan={group.rows.length} className="border-r border-neutral-100 px-4 py-3 align-middle">
                    <EmployeeCell name={group.employee.employeeName} detail={group.employee.departmentName} />
                  </td>
                )}
                <td className="border-r border-neutral-100 px-4 py-3 align-top">
                  <p className="text-sm font-medium text-neutral-900">{formatDate(row.date)}</p>
                  <p className="text-xs text-neutral-500">{WEEKDAY[parseYMD(row.date).getDay()]}</p>
                </td>
                <td className="border-r border-neutral-100 px-4 py-3 align-top">
                  <p className="text-sm text-neutral-700">
                    {row.projectName && (
                      <span className="font-semibold text-primary">{row.projectName}</span>
                    )}
                    {row.projectName && row.taskName && ', '}
                    {row.taskName && (
                      <span className="font-semibold text-neutral-900">{row.taskName}</span>
                    )}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-neutral-700">
                    {row.clockOutDescription || 'No clock-out description'}
                  </p>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[13px] text-neutral-900">
                  {row.totalHours != null ? (
                    `${formatHours(row.totalHours)}h`
                  ) : (
                    <span className="text-warning-text">0.0h</span>
                  )}
                </td>
                {index === 0 && (
                  <td rowSpan={group.rows.length} className="border-l border-neutral-100 bg-surface px-4 py-3 text-right align-middle">
                    <p className="font-mono text-xl font-semibold text-neutral-900">{group.total.toFixed(1)}</p>
                    <p className="text-xs text-neutral-500">hours</p>
                  </td>
                )}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function TimesheetGrid({
  rows,
  employees,
  dateFrom,
  dateTo,
  isLoading,
  selectedEmployeeIds,
  onToggleEmployee,
  onToggleManyEmployees,
}: {
  rows: AttendanceReportRow[];
  employees: AttendanceReportEmployeeOption[];
  dateFrom: string;
  dateTo: string;
  isLoading: boolean;
  selectedEmployeeIds: string[];
  onToggleEmployee: (employeeId: string, checked: boolean) => void;
  onToggleManyEmployees: (employeeIds: string[], checked: boolean) => void;
}) {
  const days = daysBetween(dateFrom, dateTo);
  const byEmployee = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceReportRow>>();
    for (const row of rows) {
      if (!map.has(row.employeeId)) map.set(row.employeeId, new Map());
      map.get(row.employeeId)!.set(row.date, row);
    }
    return map;
  }, [rows]);

  const visibleEmployeeIds = employees.map((employee) => employee.id);
  const selectedSet = new Set(selectedEmployeeIds);
  const visibleSelectedCount = visibleEmployeeIds.filter((id) => selectedSet.has(id)).length;
  const allVisibleSelected = visibleEmployeeIds.length > 0 && visibleSelectedCount === visibleEmployeeIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const selectAllState: boolean | 'indeterminate' = allVisibleSelected
    ? true
    : someVisibleSelected
      ? 'indeterminate'
      : false;

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-b-xl bg-neutral-50" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth: Math.max(812, 412 + days.length * 112) }}>
        <thead>
          <tr className="border-b border-neutral-200 bg-canvas">
            <th className="sticky left-0 z-10 w-[52px] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <Checkbox
                checked={selectAllState}
                onCheckedChange={(value) => onToggleManyEmployees(visibleEmployeeIds, value === true)}
                aria-label="Select all visible employees"
              />
            </th>
            <th className="sticky left-[52px] z-10 w-[320px] border-r border-neutral-100 bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Employee</th>
            {days.map((day) => (
              <th key={toYMD(day)} className="min-w-[104px] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <div>{`${MONTHS[day.getMonth()]?.slice(0, 3)} ${day.getDate()}`}</div>
                <div className="text-[10px] text-neutral-400">{WEEKDAY[day.getDay()]}</div>
              </th>
            ))}
            <th className="w-[120px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">Total</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {employees.length === 0 ? (
            <tr>
              <td colSpan={days.length + 3} className="py-16 text-center text-sm text-neutral-500">No employees match the current filters.</td>
            </tr>
          ) : (
            employees.map((employee) => {
              const dayMap = byEmployee.get(employee.id) ?? new Map<string, AttendanceReportRow>();
              const total = Array.from(dayMap.values()).reduce((sum, row) => sum + (row.totalHours ?? 0), 0);
              return (
                <tr key={employee.id} className="border-b border-neutral-100 hover:bg-canvas/60">
                  <td className="sticky left-0 z-10 border-r border-neutral-100 bg-surface px-4 py-3 align-middle">
                    <Checkbox
                      checked={selectedSet.has(employee.id)}
                      onCheckedChange={(value) => onToggleEmployee(employee.id, value === true)}
                      aria-label={`Toggle ${employee.name}`}
                    />
                  </td>
                  <td className="sticky left-[52px] z-10 border-r border-neutral-100 bg-surface px-4 py-3">
                    <EmployeeCell name={employee.name} detail={employee.email} />
                  </td>
                  {days.map((day) => {
                    const row = dayMap.get(toYMD(day));
                    const hours = row?.totalHours;
                    return (
                      <td key={toYMD(day)} className="px-3 py-3 text-center font-mono text-[13px] text-neutral-900">
                        {hours != null ? `${hours.toFixed(1)}h` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-neutral-900">{total.toFixed(1)}h</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceReportPageShell({ orgSlug, memberId }: Readonly<AttendanceReportPageShellProps>) {
  const today = useMemo(() => new Date(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const viewMode = useMemo<ViewMode>(
    () => (searchParams.get('view') === 'timesheet' ? 'timesheet' : 'report'),
    [searchParams],
  );
  const periodMode = useMemo<PeriodMode>(() => {
    const t = searchParams.get('time');
    if (t === 'monthly') return 'monthly';
    if (t === 'custom') return 'custom';
    return 'weekly';
  }, [searchParams]);

  const [anchorDate, setAnchorDate] = useState(toYMD(today));
  const [customFrom, setCustomFrom] = useState(toYMD(startOfWeek(today)));
  const [customTo, setCustomTo] = useState(toYMD(addDays(startOfWeek(today), 6)));
  const [projectId, setProjectId] = useState(ALL_PROJECTS);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [force8, setForce8] = useState(false);
  const [pendingExport, setPendingExport] = useState<AttendanceReportExportFormat | null>(null);

  function handleViewChange(next: ViewMode) {
    if (next === viewMode) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', next);
    params.set('time', periodMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handlePeriodChange(next: PeriodMode) {
    if (next === periodMode) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', viewMode);
    params.set('time', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const permissionsQuery = useMemberPermissionsQuery(orgSlug, memberId);
  const reportScope = normalizeScope(permissionsQuery.data?.attendanceReport?.view);
  const canView = reportScope === 'organization';
  const optionsQuery = useAttendanceReportOptionsQuery(orgSlug, memberId, canView);

  const dateRange = useMemo(() => {
    const anchor = parseYMD(anchorDate);
    if (periodMode === 'custom') return { dateFrom: customFrom, dateTo: customTo };
    if (periodMode === 'monthly') {
      return { dateFrom: toYMD(startOfMonth(anchor)), dateTo: toYMD(endOfMonth(anchor)) };
    }
    const start = startOfWeek(anchor);
    return { dateFrom: toYMD(start), dateTo: toYMD(addDays(start, 6)) };
  }, [anchorDate, customFrom, customTo, periodMode]);

  const selectedProject = optionsQuery.data?.projects.find((project) => project.id === projectId);
  const eligibleEmployees = useMemo(() => {
    const employees = selectedProject ? selectedProject.members : (optionsQuery.data?.employees ?? []);
    return [...employees].sort((a, b) => a.name.localeCompare(b.name));
  }, [optionsQuery.data?.employees, selectedProject]);

  const effectiveSelectedEmployeeIds = useMemo(() => {
    const eligibleIds = new Set(eligibleEmployees.map((employee) => employee.id));
    return selectedEmployeeIds.filter((id) => eligibleIds.has(id));
  }, [eligibleEmployees, selectedEmployeeIds]);

  function toggleEmployee(employeeId: string, checked: boolean) {
    setSelectedEmployeeIds((prev) => {
      if (checked) {
        if (prev.includes(employeeId)) return prev;
        return [...prev, employeeId];
      }
      return prev.filter((id) => id !== employeeId);
    });
  }

  function toggleManyEmployees(employeeIds: string[], checked: boolean) {
    setSelectedEmployeeIds((prev) => {
      const set = new Set(prev);
      if (checked) {
        for (const id of employeeIds) set.add(id);
      } else {
        for (const id of employeeIds) set.delete(id);
      }
      return Array.from(set);
    });
  }

  const filters = useMemo<AttendanceReportFilters>(() => ({
    date_from: dateRange.dateFrom,
    date_to: dateRange.dateTo,
    project_id: projectId === ALL_PROJECTS ? undefined : projectId,
    employee_ids: [],
    page: 1,
    page_size: 5000,
  }), [dateRange.dateFrom, dateRange.dateTo, projectId]);

  const reportQuery = useAttendanceReportQuery(orgSlug, memberId, filters, canView);

  function shiftPeriod(direction: -1 | 1) {
    const anchor = parseYMD(anchorDate);
    const amount = periodMode === 'monthly' ? 31 * direction : 7 * direction;
    setAnchorDate(toYMD(addDays(anchor, amount)));
  }

  const searchFilteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return null;
    return eligibleEmployees
      .filter((employee) => `${employee.name} ${employee.email ?? ''}`.toLowerCase().includes(term))
      .map((employee) => employee.id);
  }, [eligibleEmployees, employeeSearch]);

  const hasActiveFilters = employeeSearch.trim() !== '' || projectId !== ALL_PROJECTS;

  function handleProjectChange(value: string) {
    setProjectId(value);
    setSelectedEmployeeIds([]);
  }

  function handleClearFilters() {
    setEmployeeSearch('');
    setProjectId(ALL_PROJECTS);
  }

  const rows = useMemo(() => reportQuery.data?.items ?? [], [reportQuery.data?.items]);

  const searchFilteredRows = useMemo(() => {
    if (!searchFilteredEmployees) return rows;
    const allowed = new Set(searchFilteredEmployees);
    return rows.filter((row) => allowed.has(row.employeeId));
  }, [rows, searchFilteredEmployees]);

  const visibleEmployeesForView = useMemo(() => {
    if (!searchFilteredEmployees) return eligibleEmployees;
    const allowed = new Set(searchFilteredEmployees);
    return eligibleEmployees.filter((employee) => allowed.has(employee.id));
  }, [eligibleEmployees, searchFilteredEmployees]);

  const selectedVisibleEmployees = useMemo(() => {
    const selectedSet = new Set(effectiveSelectedEmployeeIds);
    if (viewMode === 'report') {
      const visibleReportEmployeeIds = new Set(searchFilteredRows.map((row) => row.employeeId));
      return visibleEmployeesForView.filter((employee) => selectedSet.has(employee.id) && visibleReportEmployeeIds.has(employee.id));
    }
    return visibleEmployeesForView.filter((employee) => selectedSet.has(employee.id));
  }, [effectiveSelectedEmployeeIds, searchFilteredRows, viewMode, visibleEmployeesForView]);

  const selectedVisibleRows = useMemo(() => {
    const selectedSet = new Set(selectedVisibleEmployees.map((employee) => employee.id));
    return searchFilteredRows.filter((row) => selectedSet.has(row.employeeId));
  }, [searchFilteredRows, selectedVisibleEmployees]);

  async function handleExport(format: AttendanceReportExportFormat) {
    if (pendingExport || reportQuery.isLoading || optionsQuery.isLoading) return;
    if (selectedVisibleEmployees.length === 0) {
      toast.error('Select at least one visible employee to export.');
      return;
    }

    setPendingExport(format);
    try {
      const title = exportTitle(viewMode, periodMode, dateRange.dateFrom, dateRange.dateTo);
      const blob = await exportAttendanceReportAction({
        orgSlug,
        memberId,
        payload: {
          format,
          mode: viewMode,
          title,
          periodLabel: periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo),
          dateColumns: daysBetween(dateRange.dateFrom, dateRange.dateTo).map(toYMD),
          employees: selectedVisibleEmployees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            email: employee.email,
          })),
          rows: selectedVisibleRows,
          force8,
        },
      });
      triggerDownload(blob, exportFileName(viewMode, periodMode, dateRange.dateFrom, format));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setPendingExport(null);
    }
  }

  if (permissionsQuery.isLoading) {
    return (
      <main className="min-h-full bg-canvas p-7">
        <div className="h-96 animate-pulse rounded-xl bg-neutral-100" />
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="flex min-h-full items-center justify-center bg-canvas p-7">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-neutral-500 shadow-[var(--shadow-1)]">
          You do not have permission to view attendance reports.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-canvas p-7">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Reports Dashboard</h1>
      </div>

      <section className="overflow-hidden rounded-2xl bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <TabSlider
                modes={VIEW_MODES}
                activeMode={viewMode}
                onChange={handleViewChange}
              />
              <TabSlider
                modes={PERIOD_MODES}
                activeMode={periodMode}
                onChange={handlePeriodChange}
              />
              <div className="flex items-center gap-1">
                {periodMode !== 'custom' ? (
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftPeriod(-1)} aria-label="Previous period">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="flex h-9 min-w-[180px] items-center justify-center gap-2 rounded-md border border-neutral-100 bg-surface px-3 text-[13px] font-semibold text-neutral-900 shadow-[var(--shadow-1)]">
                      <CalendarDays className="size-3.5 text-neutral-400" />
                      {periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo)}
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftPeriod(1)} aria-label="Next period">
                      <ChevronRight className="size-4" />
                    </Button>
                  </>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 min-w-[180px] justify-start gap-2 rounded-md border border-neutral-100 bg-surface px-3 text-[13px] font-semibold text-neutral-900 shadow-[var(--shadow-1)]"
                      >
                        <CalendarDays className="size-3.5 text-neutral-400" />
                        {periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{ from: parseYMD(customFrom), to: parseYMD(customTo) }}
                        onSelect={(range: DateRange | undefined) => {
                          if (range?.from) setCustomFrom(toYMD(range.from));
                          if (range?.to) setCustomTo(toYMD(range.to));
                        }}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  disabled={pendingExport !== null || reportQuery.isLoading || optionsQuery.isLoading}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] font-medium text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent hover:border-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pendingExport === 'xlsx' ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('CSV export is ignored for now.')}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] font-medium text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent hover:border-black/[0.04]"
                >
                  <Download className="size-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={pendingExport !== null || reportQuery.isLoading || optionsQuery.isLoading}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] font-medium text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent hover:border-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pendingExport === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  PDF
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <Checkbox
                  checked={force8}
                  onCheckedChange={(value) => setForce8(value === true)}
                  aria-label="Force 8 hours maximum per record"
                />
                <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-700 transition-colors duration-150">
                  Force 8 hrs max
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <Input
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={projectId}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm border-0 bg-canvas">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                  {(optionsQuery.data?.projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {reportQuery.isError && (
          <div className="border-t border-neutral-100 bg-destructive-bg px-5 py-3 text-sm text-destructive-text">
            Failed to load attendance report.
          </div>
        )}

        {viewMode === 'report' ? (
          <ReportTable
            rows={searchFilteredRows}
            isLoading={reportQuery.isLoading || optionsQuery.isLoading}
            selectedEmployeeIds={effectiveSelectedEmployeeIds}
            onToggleEmployee={toggleEmployee}
            onToggleManyEmployees={toggleManyEmployees}
          />
        ) : (
          <TimesheetGrid
            rows={searchFilteredRows}
            employees={visibleEmployeesForView}
            dateFrom={dateRange.dateFrom}
            dateTo={dateRange.dateTo}
            isLoading={reportQuery.isLoading || optionsQuery.isLoading}
            selectedEmployeeIds={effectiveSelectedEmployeeIds}
            onToggleEmployee={toggleEmployee}
            onToggleManyEmployees={toggleManyEmployees}
          />
        )}
      </section>
    </main>
  );
}
