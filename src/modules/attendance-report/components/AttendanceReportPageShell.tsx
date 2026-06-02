'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  List,
  Save,
  Search,
  Send,
  SquareCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import {
  useAttendanceReportOptionsQuery,
  useAttendanceReportQuery,
} from '@/modules/attendance-report/hooks';
import type {
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

function normalizeScope(value: string | undefined): string {
  return value === 'org' ? 'organization' : value ?? 'none';
}

function ExportButtons() {
  const handlePlaceholder = (label: string) => {
    toast.info(`${label} export is a placeholder for now.`);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" className="bg-primary hover:bg-primary-hover" onClick={() => handlePlaceholder('Excel')}>
        <FileSpreadsheet className="size-4" />
        Excel
      </Button>
      <Button type="button" className="bg-info text-white hover:bg-info/90" onClick={() => handlePlaceholder('CSV')}>
        <Download className="size-4" />
        CSV
      </Button>
      <Button type="button" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => handlePlaceholder('PDF')}>
        <FileText className="size-4" />
        PDF
      </Button>
    </div>
  );
}

function EmployeePicker({
  employees,
  selectedIds,
  onChange,
}: {
  employees: AttendanceReportEmployeeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      `${employee.name} ${employee.email ?? ''}`.toLowerCase().includes(term),
    );
  }, [employees, search]);
  const label = selectedIds.length === 0 ? 'All Employees' : `${selectedIds.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-11 min-w-[260px] justify-between rounded-md bg-surface px-3 text-left font-normal shadow-[var(--shadow-1)]">
          <span className="truncate">{label}</span>
          <ChevronRight className="size-4 rotate-90 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] gap-3 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees"
            className="h-9 bg-neutral-50 pl-9"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onChange(employees.map((employee) => employee.id))}>
            Select all
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto pr-1">
          {filteredEmployees.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">No employees found.</p>
          ) : (
            filteredEmployees.map((employee) => {
              const checked = selectedSet.has(employee.id);
              return (
                <label
                  key={employee.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (value) onChange([...selectedIds, employee.id]);
                      else onChange(selectedIds.filter((id) => id !== employee.id));
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{employee.name}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
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

function ReportTable({ rows, isLoading }: { rows: AttendanceReportRow[]; isLoading: boolean }) {
  const groups = groupByEmployee(rows);
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-b-xl bg-neutral-50" />;
  }
  if (groups.length === 0) {
    return <div className="py-16 text-center text-sm text-neutral-500">No report rows match the current filters.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 bg-canvas">
            <th className="w-[280px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Employee</th>
            <th className="w-[170px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Date</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</th>
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
                    <EmployeeCell name={group.employee.employeeName} detail={group.employee.departmentName} />
                  </td>
                )}
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-medium text-neutral-900">{formatDate(row.date)}</p>
                  <p className="text-xs text-neutral-500">{WEEKDAY[parseYMD(row.date).getDay()]}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm text-neutral-900">
                    {row.projectName ? `[${row.projectName}] ` : ''}
                    {row.taskName ? `${row.taskName}: ` : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-neutral-700">
                    {row.clockOutDescription || 'No clock-out description'}
                  </p>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[13px]">
                  <span className={cn('rounded px-2 py-1', (row.totalHours ?? 0) > 0 ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text')}>
                    {formatHours(row.totalHours)}h
                  </span>
                </td>
                {index === 0 && (
                  <td rowSpan={group.rows.length} className="bg-neutral-50 px-4 py-3 text-right align-middle">
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
}: {
  rows: AttendanceReportRow[];
  employees: AttendanceReportEmployeeOption[];
  dateFrom: string;
  dateTo: string;
  isLoading: boolean;
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

  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-b-xl bg-neutral-50" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth: Math.max(760, 360 + days.length * 112) }}>
        <thead>
          <tr className="border-b border-neutral-200 bg-canvas">
            <th className="sticky left-0 z-10 w-[320px] bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Employee</th>
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
              <td colSpan={days.length + 2} className="py-16 text-center text-sm text-neutral-500">No employees match the current filters.</td>
            </tr>
          ) : (
            employees.map((employee) => {
              const dayMap = byEmployee.get(employee.id) ?? new Map<string, AttendanceReportRow>();
              const total = Array.from(dayMap.values()).reduce((sum, row) => sum + (row.totalHours ?? 0), 0);
              return (
                <tr key={employee.id} className="border-b border-neutral-100 hover:bg-canvas/60">
                  <td className="sticky left-0 z-10 border-r border-neutral-100 bg-surface px-4 py-3">
                    <EmployeeCell name={employee.name} detail={employee.email} />
                  </td>
                  {days.map((day) => {
                    const row = dayMap.get(toYMD(day));
                    return (
                      <td key={toYMD(day)} className="px-3 py-3 text-center font-mono text-[13px] text-neutral-400">
                        {row?.totalHours != null ? (
                          <span className="rounded bg-success-bg px-2 py-1 text-success-text">{row.totalHours.toFixed(1)}h</span>
                        ) : (
                          '-'
                        )}
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
  const [periodMode, setPeriodMode] = useState<PeriodMode>('weekly');
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  const [anchorDate, setAnchorDate] = useState(toYMD(today));
  const [customFrom, setCustomFrom] = useState(toYMD(startOfWeek(today)));
  const [customTo, setCustomTo] = useState(toYMD(addDays(startOfWeek(today), 6)));
  const [projectId, setProjectId] = useState(ALL_PROJECTS);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

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

  const visibleEmployees = effectiveSelectedEmployeeIds.length > 0
    ? eligibleEmployees.filter((employee) => effectiveSelectedEmployeeIds.includes(employee.id))
    : eligibleEmployees;

  const filters = useMemo<AttendanceReportFilters>(() => ({
    date_from: dateRange.dateFrom,
    date_to: dateRange.dateTo,
    project_id: projectId === ALL_PROJECTS ? undefined : projectId,
    employee_ids: effectiveSelectedEmployeeIds,
    page: 1,
    page_size: 5000,
  }), [dateRange.dateFrom, dateRange.dateTo, effectiveSelectedEmployeeIds, projectId]);

  const reportQuery = useAttendanceReportQuery(orgSlug, memberId, filters, canView);

  function shiftPeriod(direction: -1 | 1) {
    const anchor = parseYMD(anchorDate);
    const amount = periodMode === 'monthly' ? 31 * direction : 7 * direction;
    setAnchorDate(toYMD(addDays(anchor, amount)));
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

  const rows = reportQuery.data?.items ?? [];
  const showingCount = new Set(rows.map((row) => row.employeeId)).size;

  return (
    <main className="min-h-full bg-canvas p-7">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Reports Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500">Overview of attendance across the organization with saved views</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex rounded-lg bg-neutral-50 p-1">
                {(['weekly', 'monthly', 'custom'] as PeriodMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPeriodMode(mode)}
                    className={cn(
                      'h-9 rounded-md px-4 text-sm capitalize text-neutral-500 transition-colors',
                      periodMode === mode && 'bg-surface text-neutral-900 shadow-[var(--shadow-1)]',
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-info-bg p-1">
                {(['report', 'timesheet'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'h-9 rounded-md px-4 text-sm capitalize text-info-text transition-colors',
                      viewMode === mode && 'bg-primary text-white shadow-[var(--shadow-1)]',
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {periodMode !== 'custom' ? (
                <>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftPeriod(-1)} aria-label="Previous period">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex h-11 min-w-[300px] items-center justify-center gap-2 rounded-md border border-neutral-100 bg-surface px-4 text-sm font-semibold text-neutral-900 shadow-[var(--shadow-1)]">
                    <CalendarDays className="size-4 text-neutral-400" />
                    {periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo)}
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftPeriod(1)} aria-label="Next period">
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">From</span>
                  <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-11 w-[160px] bg-surface" />
                  <span className="text-sm text-neutral-500">To</span>
                  <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-11 w-[160px] bg-surface" />
                </div>
              )}
            </div>

            <ExportButtons />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Filter className="size-5 text-neutral-500" />
            <label className="text-sm font-medium text-neutral-700">Project:</label>
            <Select
              value={projectId}
              onValueChange={(value) => {
                setProjectId(value);
                setSelectedEmployeeIds([]);
              }}
            >
              <SelectTrigger className="h-11 w-[260px] bg-surface shadow-[var(--shadow-1)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All Projects</SelectItem>
                {(optionsQuery.data?.projects ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-8 w-px bg-neutral-200" />
            <label className="text-sm font-medium text-neutral-700">Employee:</label>
            <EmployeePicker
              employees={eligibleEmployees}
              selectedIds={effectiveSelectedEmployeeIds}
              onChange={setSelectedEmployeeIds}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {projectId !== ALL_PROJECTS && selectedProject && (
                <span className="rounded bg-info-bg px-3 py-1 text-info-text">Project: {selectedProject.name}</span>
              )}
              <span className="rounded bg-info-bg px-3 py-1 text-info-text">
                {effectiveSelectedEmployeeIds.length > 0 ? `${effectiveSelectedEmployeeIds.length} employees selected` : `${eligibleEmployees.length} employees eligible`}
              </span>
              <span className="text-neutral-500">Showing {showingCount} employees</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => toast.info('Save view is a placeholder for now.')}>
                <Save className="size-4" />
                Save View
              </Button>
              <Button type="button" variant="outline" onClick={() => toast.info('Load view is a placeholder for now.')}>
                <List className="size-4" />
                Load View
              </Button>
              <Button type="button" variant="outline" onClick={() => toast.info('Force 8 Hours is a placeholder for now.')}>
                <SquareCheck className="size-4" />
                Force 8 Hours
              </Button>
              <Button type="button" className="bg-primary text-white hover:bg-primary-hover" onClick={() => toast.info('Send to Teams is a placeholder for now.')}>
                <Send className="size-4" />
                Send to Teams
              </Button>
            </div>
          </div>
        </div>

        {reportQuery.isError && (
          <div className="border-t border-neutral-100 bg-destructive-bg px-5 py-3 text-sm text-destructive-text">
            Failed to load attendance report.
          </div>
        )}

        {viewMode === 'report' ? (
          <ReportTable rows={rows} isLoading={reportQuery.isLoading || optionsQuery.isLoading} />
        ) : (
          <TimesheetGrid
            rows={rows}
            employees={visibleEmployees}
            dateFrom={dateRange.dateFrom}
            dateTo={dateRange.dateTo}
            isLoading={reportQuery.isLoading || optionsQuery.isLoading}
          />
        )}
      </section>
    </main>
  );
}
