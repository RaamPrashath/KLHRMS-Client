'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmployeePagination } from '@/modules/employees/components/EmployeePagination';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useMemberPermissionsQuery } from '@/modules/attendance/hooks/queries/attendance';
import { resolveAttendancePermissions } from '@/modules/attendance/utils/attendancePermissions';
import { useManualAttendanceMutation, useDeleteAttendanceMutation } from '@/modules/attendance/hooks/mutations/attendance';
import type { ApiError } from '@/modules/attendance/types/attendanceTypes';
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
import type { ManualEntryInput } from '@/modules/attendance/schema/attendanceSchemas';

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
              ? 'text-primary'
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
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
        {initials || 'E'}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <span
          className="text-[13px] font-medium text-neutral-900 leading-tight truncate"
          title={name}
        >
          {name}
        </span>
        {detail && (
          <span className="text-[11px] text-neutral-400 leading-tight truncate">{detail}</span>
        )}
      </div>
    </div>
  );
}

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);



function ReportTable({
  rows,
  isLoading,
}: {
  rows: AttendanceReportRow[];
  isLoading: boolean;
}) {
  const groups = useMemo(() => groupByEmployee(rows), [rows]);

  const headerRow = (
    <TableRow className="border-black/[0.04] hover:bg-transparent">
      <TableHead className="w-[20%] h-auto py-3 px-4 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 sticky left-0 z-10 bg-canvas/50">Employee</TableHead>
      <TableHead className="w-[15%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Date</TableHead>
      <TableHead className="w-[45%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Description</TableHead>
      <TableHead className="w-[10%] h-auto py-3 px-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Hours</TableHead>
      <TableHead className="w-[10%] h-auto py-3 px-4 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500 text-right border-l border-black/[0.04]">Total</TableHead>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table className="table-fixed min-w-[960px]">
          <TableHeader className="bg-canvas/50">{headerRow}</TableHeader>
          <ShadcnTableBody className="bg-surface">
            {SKELETON_IDS.slice(0, 10).map((id) => (
              <TableRow key={id} className="border-black/4 hover:bg-transparent">
                <TableCell colSpan={5} className="p-6">
                  <div className="h-12 w-full animate-pulse rounded-xl bg-neutral-100" />
                </TableCell>
              </TableRow>
            ))}
          </ShadcnTableBody>
        </Table>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="overflow-x-auto">
        <Table className="table-fixed min-w-[960px]">
          <TableHeader className="bg-canvas/50">{headerRow}</TableHeader>
          <ShadcnTableBody className="bg-surface">
            <TableRow className="border-black/4 hover:bg-transparent">
              <TableCell colSpan={5} className="py-16 text-center text-sm text-neutral-400">
                No report rows match the current filters.
              </TableCell>
            </TableRow>
          </ShadcnTableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-[960px]">
        <TableHeader className="bg-canvas/50">{headerRow}</TableHeader>
        <ShadcnTableBody className="bg-surface">
          {groups.map((group) => {
            const rowCount = group.rows.length;
            return group.rows.map((row, rowIdx) => (
              <TableRow key={row.attendanceRecordId} className="border-black/4 transition-colors hover:bg-black/[0.02]">
                {rowIdx === 0 && (
                  <TableCell
                    className="px-4 py-3 align-top whitespace-nowrap sticky left-0 z-10 bg-surface border-r border-neutral-100"
                    rowSpan={rowCount}
                  >
                    <EmployeeCell name={group.employee.employeeName} detail={group.employee.departmentName} />
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 align-top whitespace-nowrap">
                  <p className="text-sm font-medium text-neutral-900">{formatDate(row.date)}</p>
                  <p className="text-xs text-neutral-500">{WEEKDAY[parseYMD(row.date).getDay()]}</p>
                </TableCell>
                <TableCell className="px-4 py-3 align-top whitespace-nowrap">
                  <p className="text-sm text-neutral-700">
                    {row.projectName && <span className="font-semibold text-primary">{row.projectName}</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-neutral-700">
                    {row.clockOutDescription || 'No clock-out description'}
                  </p>
                </TableCell>
                <TableCell className="px-4 py-3 align-top whitespace-nowrap text-right font-mono text-[13px] text-neutral-900">
                  {row.totalHours != null ? (
                    `${formatHours(row.totalHours)}h`
                  ) : (
                    <span className="text-warning-text">0.0h</span>
                  )}
                </TableCell>
                {rowIdx === 0 && (
                  <TableCell
                    className="px-4 py-3 align-top whitespace-nowrap text-right border-l border-black/[0.04]"
                    rowSpan={rowCount}
                  >
                    <p className="font-mono text-xl font-semibold text-neutral-900">{group.total.toFixed(1)}</p>
                    <p className="text-xs text-neutral-500">hours</p>
                  </TableCell>
                )}
              </TableRow>
            ));
          })}
        </ShadcnTableBody>
      </Table>
    </div>
  );
}

function TimesheetGrid({
  orgSlug,
  memberId,
  rows,
  employees,
  dateFrom,
  dateTo,
  isLoading,
  canEdit,
}: {
  orgSlug: string;
  memberId: string;
  rows: AttendanceReportRow[];
  employees: AttendanceReportEmployeeOption[];
  dateFrom: string;
  dateTo: string;
  isLoading: boolean;
  canEdit: boolean;
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

  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [activeMenuCell, setActiveMenuCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const manualMutation = useManualAttendanceMutation(orgSlug, memberId);
  const deleteMutation = useDeleteAttendanceMutation(orgSlug);

  useEffect(() => {
    if (!activeMenuCell) {
      setMenuPos(null);
      return;
    }
    const raf = requestAnimationFrame(() => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        setMenuPos({ x: rect.left + rect.width / 2 - 24, y: rect.bottom });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeMenuCell]);

  async function handleSave(employeeId: string, dayString: string, value: string) {
    setEditingCell(null);
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') {
      setIsSaving(true);
      try {
        await deleteMutation.mutateAsync({
          orgSlug,
          memberId,
          targetMemberId: employeeId,
          date: dayString,
        });
        await queryClient.invalidateQueries({ queryKey: ['attendance-report', orgSlug] });
        toast.success('Hours deleted successfully');
      } catch (err: unknown) {
        let message = 'Failed to delete hours';
        if (err instanceof Error) {
          try { message = (JSON.parse(err.message) as ApiError).message; } catch { message = err.message; }
        }
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const newHours = parseFloat(trimmed);
    if (isNaN(newHours) || newHours < 0 || newHours > 24) {
      toast.error('Please enter a valid number of hours between 0 and 24');
      return;
    }

    if (newHours === 0) {
      setIsSaving(true);
      try {
        await deleteMutation.mutateAsync({
          orgSlug,
          memberId,
          targetMemberId: employeeId,
          date: dayString,
        });
        await queryClient.invalidateQueries({ queryKey: ['attendance-report', orgSlug] });
        toast.success('Hours deleted successfully');
      } catch (err: unknown) {
        let message = 'Failed to delete hours';
        if (err instanceof Error) {
          try { message = (JSON.parse(err.message) as ApiError).message; } catch { message = err.message; }
        }
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const employeeRows = byEmployee.get(employeeId);
    const existingRow = employeeRows?.get(dayString);

    let startHour = 9;
    let startMinute = 0;

    if (existingRow?.clockIn) {
      try {
        const d = new Date(existingRow.clockIn);
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        });
        const parts = formatter.formatToParts(d);
        const h = parts.find(p => p.type === 'hour')?.value;
        const m = parts.find(p => p.type === 'minute')?.value;
        if (h) startHour = parseInt(h, 10);
        if (m) startMinute = parseInt(m, 10);
      } catch {
        // ignore and fallback to 9:00 AM
      }
    }

    const totalMinutes = Math.round(newHours * 60);
    const endMinutesSinceMidnight = (startHour * 60 + startMinute) + totalMinutes;
    const endHour = Math.floor(endMinutesSinceMidnight / 60) % 24;
    const endMinute = endMinutesSinceMidnight % 60;

    const toISOFromIST = (dateStr: string, timeStr: string): string => {
      const istString = `${dateStr}T${timeStr}:00+05:30`;
      return new Date(istString).toISOString();
    };

    const pad = (n: number) => String(n).padStart(2, '0');
    const clockInStr = toISOFromIST(dayString, `${pad(startHour)}:${pad(startMinute)}`);
    const clockOutStr = toISOFromIST(dayString, `${pad(endHour)}:${pad(endMinute)}`);

    setIsSaving(true);
    try {
      await manualMutation.mutateAsync({
        target_member_id: employeeId,
        date: dayString,
        clock_in: clockInStr,
        clock_out: clockOutStr,
      });
      await queryClient.invalidateQueries({ queryKey: ['attendance-report', orgSlug] });
      toast.success('Hours updated successfully');
    } catch (err: unknown) {
      let message = 'Failed to update hours';
      if (err instanceof Error) {
        try { message = (JSON.parse(err.message) as ApiError).message; } catch { message = err.message; }
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo<ColumnDef<AttendanceReportEmployeeOption>[]>(() => [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <EmployeeCell name={row.original.name} />
      ),
    },
    ...days.map((day) => ({
      id: toYMD(day),
      header: `${MONTHS[day.getMonth()]?.slice(0, 3)} ${day.getDate()}`,
      cell: ({ row }: { row: Row<AttendanceReportEmployeeOption> }) => {
        const dayStr = toYMD(day);
        const dayMap = byEmployee.get(row.original.id) ?? new Map<string, AttendanceReportRow>();
        const cellRow = dayMap.get(dayStr);
        const hours = cellRow?.totalHours;
        const leaveTypeName = cellRow?.leaveTypeName;
        const entryType = cellRow?.entryType;
        const isEditing = editingCell?.employeeId === row.original.id && editingCell?.date === dayStr;
        const isMenuOpen = activeMenuCell?.employeeId === row.original.id && activeMenuCell?.date === dayStr;

        if (leaveTypeName) {
          return (
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[58px] h-7 text-red-800 bg-red-50 border border-red-200" title={leaveTypeName}>
              L
            </span>
          );
        }

        if (isMenuOpen && canEdit) {
          return (
            <div ref={menuRef} className="relative inline-flex">
              {createPortal(
                <div
                  className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-neutral-200 py-1 min-w-[48px]"
                  style={{ left: menuPos ? menuPos.x : 0, top: menuPos ? menuPos.y : 0 }}
                  onMouseLeave={() => {
                    setActiveMenuCell(null);
                    setMenuPos(null);
                  }}
                >
                  {(['LEAVE', 'HOLIDAY', 'FLOATING_HOLIDAY', 'COMP_OFF'] as const).map((key) => {
                    const short = key === 'LEAVE' ? 'L' : key === 'HOLIDAY' ? 'H' : key === 'FLOATING_HOLIDAY' ? 'FH' : 'CO';
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setActiveMenuCell(null);
                          setMenuPos(null);
                          setIsSaving(true);
                          manualMutation.mutateAsync({
                            target_member_id: row.original.id,
                            date: dayStr,
                            entry_type: key,
                          } satisfies ManualEntryInput).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['attendance-report', orgSlug] });
                          }).finally(() => setIsSaving(false));
                        }}
                        className="flex items-center justify-center w-full px-3 py-1 text-xs font-bold font-mono text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        {short}
                      </button>
                    );
                  })}
                  <div className="border-t border-neutral-100 mx-2" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuCell(null);
                      setMenuPos(null);
                      setEditingCell({ employeeId: row.original.id, date: dayStr });
                    }}
                    className="flex items-center justify-center w-full px-3 py-1 text-xs font-mono text-neutral-500 hover:bg-neutral-100 transition-colors"
                  >
                    Custom
                  </button>
                  {(hours != null || entryType) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuCell(null);
                        setMenuPos(null);
                        setIsSaving(true);
                        deleteMutation.mutateAsync({
                          orgSlug,
                          memberId,
                          targetMemberId: row.original.id,
                          date: dayStr,
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['attendance-report', orgSlug] });
                        }).finally(() => setIsSaving(false));
                      }}
                      className="flex items-center justify-center w-full px-3 py-1 text-xs font-bold font-mono text-neutral-400 hover:bg-neutral-100 transition-colors"
                    >
                      X
                    </button>
                  )}
                </div>,
                document.body,
              )}
            </div>
          );
        }

        if (isEditing) {
          return (
            <Input
              type="text"
              className="w-16 h-8 text-center text-xs font-semibold font-mono border-primary focus-visible:ring-primary focus-visible:ring-1 mx-auto bg-surface"
              defaultValue={hours != null ? hours.toFixed(1) : ''}
              onBlur={(e) => {
                handleSave(row.original.id, dayStr, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave(row.original.id, dayStr, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              autoFocus
              disabled={isSaving}
            />
          );
        }

        if (entryType === 'LEAVE') {
          return (
            <span
              onClick={() => { if (canEdit && !isSaving) setActiveMenuCell({ employeeId: row.original.id, date: dayStr }); }}
              className={cn(
                "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[58px] h-7 border transition-all duration-150 select-none",
                "text-red-700 bg-red-50 border-red-200",
                canEdit && "cursor-pointer hover:bg-red-100/70",
              )}
            >
              L
            </span>
          );
        }

        if (entryType === 'HOLIDAY') {
          return (
            <span
              onClick={() => { if (canEdit && !isSaving) setActiveMenuCell({ employeeId: row.original.id, date: dayStr }); }}
              className={cn(
                "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[58px] h-7 border transition-all duration-150 select-none",
                "text-violet-700 bg-violet-50 border-violet-200",
                canEdit && "cursor-pointer hover:bg-violet-100/70",
              )}
            >
              H
            </span>
          );
        }

        if (entryType === 'FLOATING_HOLIDAY') {
          return (
            <span
              onClick={() => { if (canEdit && !isSaving) setActiveMenuCell({ employeeId: row.original.id, date: dayStr }); }}
              className={cn(
                "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[58px] h-7 border transition-all duration-150 select-none",
                "text-cyan-700 bg-cyan-50 border-cyan-200",
                canEdit && "cursor-pointer hover:bg-cyan-100/70",
              )}
            >
              FH
            </span>
          );
        }

        if (entryType === 'COMP_OFF') {
          return (
            <span
              onClick={() => { if (canEdit && !isSaving) setActiveMenuCell({ employeeId: row.original.id, date: dayStr }); }}
              className={cn(
                "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold font-mono min-w-[58px] h-7 border transition-all duration-150 select-none",
                "text-amber-700 bg-amber-50 border-amber-200",
                canEdit && "cursor-pointer hover:bg-amber-100/70",
              )}
            >
              CO
            </span>
          );
        }

        return (
          <span
            onClick={() => {
              if (canEdit && !isSaving) {
                setActiveMenuCell({ employeeId: row.original.id, date: dayStr });
              }
            }}
            className={cn(
              "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold border font-mono min-w-[58px] select-none transition-all duration-150 h-7",
              hours != null
                ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30 hover:bg-emerald-100/70"
                : "text-neutral-400 border-transparent hover:text-neutral-950",
              canEdit && "cursor-pointer",
            )}
          >
            {hours != null ? `${hours.toFixed(1)}h` : '-'}
          </span>
        );
      },
    })),
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const dayMap = byEmployee.get(row.original.id) ?? new Map<string, AttendanceReportRow>();
        const total = Array.from(dayMap.values()).reduce((sum, r) => sum + (r.totalHours ?? 0), 0);
        return <span className="font-mono text-sm font-semibold text-neutral-900">{total.toFixed(1)}h</span>;
      },
    },
  ], [days, byEmployee, editingCell, activeMenuCell, canEdit, isSaving, orgSlug, memberId, manualMutation, deleteMutation, queryClient, handleSave]);

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const columnCount = table.getAllLeafColumns().length;

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: Math.max(812, 412 + days.length * 112) }}>
          <TableHeader className="bg-canvas/50">
            <TableRow className="border-black/[0.04] hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-canvas w-[300px] border-r border-black/[0.04]">Employee</TableHead>
              {days.map((day) => (
                <TableHead key={toYMD(day)} className="text-center">{MONTHS[day.getMonth()]?.slice(0, 3)} {day.getDate()}</TableHead>
              ))}
              <TableHead className="text-right border-l border-black/[0.04]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <ShadcnTableBody className="bg-surface">
            {SKELETON_IDS.slice(0, 8).map((id) => (
              <TableRow key={id} className="border-black/4 hover:bg-transparent">
                <TableCell colSpan={columnCount} className="p-6">
                  <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                </TableCell>
              </TableRow>
            ))}
          </ShadcnTableBody>
        </Table>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: Math.max(812, 412 + days.length * 112) }}>
          <TableHeader className="bg-canvas/50">
            <TableRow className="border-black/[0.04] hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-canvas px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[300px] border-r border-black/[0.04]">Employee</TableHead>
              {days.map((day) => (
                <TableHead key={toYMD(day)} className="min-w-[104px] px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <div>{`${MONTHS[day.getMonth()]?.slice(0, 3)} ${day.getDate()}`}</div>
                  <div className="text-[10px] text-neutral-400">{WEEKDAY[day.getDay()]}</div>
                </TableHead>
              ))}
              <TableHead className="w-[120px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 border-l border-black/[0.04]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <ShadcnTableBody className="bg-surface">
            <TableRow className="border-black/4 hover:bg-transparent">
              <TableCell colSpan={columnCount} className="py-16 text-center text-sm text-neutral-400">
                No employees match the current filters.
              </TableCell>
            </TableRow>
          </ShadcnTableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed" style={{ minWidth: Math.max(812, 412 + days.length * 112) }}>
        <TableHeader className="bg-canvas/50">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    header.id === 'employee' ? 'sticky left-0 z-10 bg-canvas w-[300px] border-r border-black/[0.04]' : 'w-[100px]',
                    'px-3 py-2 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
                    header.id === 'total' ? 'text-right w-[100px] border-l border-black/[0.04]' : 'text-center',
                  )}
                >
                  {header.isPlaceholder
                    ? ''
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <ShadcnTableBody className="bg-surface">
          {table.getRowModel().rows.map((row) => {
            const dayMap = byEmployee.get(row.original.id) ?? new Map<string, AttendanceReportRow>();
            const total = Array.from(dayMap.values()).reduce((sum, r) => sum + (r.totalHours ?? 0), 0);
            return (
              <TableRow key={row.id} className="border-black/4 transition-colors hover:bg-black/[0.02]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === 'employee' ? 'sticky left-0 z-10 bg-surface w-[300px] border-r border-black/[0.04]' : '',
                      'px-3 py-3 align-middle whitespace-nowrap',
                      cell.column.id === 'total' ? 'text-right border-l border-black/[0.04]' : 'text-center',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </ShadcnTableBody>
      </Table>
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
  const timesheetPage = useMemo(() => {
    const p = searchParams.get('page');
    return p ? Math.max(1, parseInt(p, 10)) : 1;
  }, [searchParams]);

  const timesheetPageSize = useMemo(() => {
    const s = searchParams.get('pageSize');
    return s ? Math.max(1, parseInt(s, 10)) : 10;
  }, [searchParams]);

  function updateSearchParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleTimesheetPageChange(page: number) {
    updateSearchParams({ page: page === 1 ? null : String(page) });
  }

  function handleTimesheetPageSizeChange(size: number) {
    updateSearchParams({ pageSize: String(size), page: null });
  }

  const prevFilterKey = useRef(`${employeeSearch}|${projectId}`);
  useEffect(() => {
    const key = `${employeeSearch}|${projectId}`;
    if (key !== prevFilterKey.current && searchParams.has('page')) {
      prevFilterKey.current = key;
      updateSearchParams({ page: null });
    } else {
      prevFilterKey.current = key;
    }
  }, [employeeSearch, projectId, searchParams]);

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
  const permissions = useMemo(() => {
    return resolveAttendancePermissions(permissionsQuery.data ?? {});
  }, [permissionsQuery.data]);
  const canEdit = permissions.edit === 'organization';
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
    const result = selectedEmployeeIds.filter((id) => eligibleIds.has(id));
    console.log("SHELL STATE:", {
      selectedEmployeeIds,
      eligibleIds: Array.from(eligibleIds),
      effectiveSelectedEmployeeIds: result
    });
    return result;
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

  const hasActiveFilters = employeeSearch.trim() !== '' || projectId !== ALL_PROJECTS || selectedEmployeeIds.length > 0;

  function handleProjectChange(value: string) {
    setProjectId(value);
    setSelectedEmployeeIds([]);
    updateSearchParams({ page: null });
  }

  function handleClearFilters() {
    setEmployeeSearch('');
    setProjectId(ALL_PROJECTS);
    setSelectedEmployeeIds([]);
    updateSearchParams({ page: null });
  }

  const rows = useMemo(() => reportQuery.data?.items ?? [], [reportQuery.data?.items]);

  const searchFilteredRows = useMemo(() => {
    let filtered = rows;
    if (searchFilteredEmployees) {
      const allowed = new Set(searchFilteredEmployees);
      filtered = filtered.filter((row) => allowed.has(row.employeeId));
    }
    if (effectiveSelectedEmployeeIds.length > 0) {
      const selectedSet = new Set(effectiveSelectedEmployeeIds);
      filtered = filtered.filter((row) => selectedSet.has(row.employeeId));
    }
    return filtered;
  }, [rows, searchFilteredEmployees, effectiveSelectedEmployeeIds]);

  const visibleEmployeesForView = useMemo(() => {
    let list = eligibleEmployees;
    if (searchFilteredEmployees) {
      const allowed = new Set(searchFilteredEmployees);
      list = list.filter((employee) => allowed.has(employee.id));
    }
    if (effectiveSelectedEmployeeIds.length > 0) {
      const selectedSet = new Set(effectiveSelectedEmployeeIds);
      list = list.filter((employee) => selectedSet.has(employee.id));
    }
    return list;
  }, [eligibleEmployees, searchFilteredEmployees, effectiveSelectedEmployeeIds]);

  const timesheetTotalEmployees = visibleEmployeesForView.length;
  const timesheetTotalPages = Math.max(1, Math.ceil(timesheetTotalEmployees / timesheetPageSize));
  const paginatedTimesheetEmployees = useMemo(() => {
    const start = (timesheetPage - 1) * timesheetPageSize;
    return visibleEmployeesForView.slice(start, start + timesheetPageSize);
  }, [visibleEmployeesForView, timesheetPage, timesheetPageSize]);

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

    const exportEmployees = selectedVisibleEmployees.length > 0
      ? selectedVisibleEmployees
      : visibleEmployeesForView;

    const exportRows = selectedVisibleEmployees.length > 0
      ? selectedVisibleRows
      : searchFilteredRows;

    if (exportEmployees.length === 0) {
      toast.error('No employee data available to export.');
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
          employees: exportEmployees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            email: employee.email,
          })),
          rows: exportRows,
          force8,
          projectId: projectId === ALL_PROJECTS ? undefined : projectId,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
        },
      });
      triggerDownload(blob, exportFileName(viewMode, periodMode, dateRange.dateFrom, format));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setPendingExport(null);
    }
  }

  const [employeeFilterOpen, setEmployeeFilterOpen] = useState(false);
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);

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
      <h1 className="mb-6 text-4xl font-semibold tracking-tight text-neutral-900">Reports Dashboard</h1>

      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
        {/* Band 1: Navigation — tab sliders + period nav + export actions */}
        <div className="flex flex-wrap items-center gap-3 px-8 py-6">
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
              <div className="inline-flex items-center bg-muted/30 border border-border rounded-lg overflow-hidden h-9">
                <button
                  type="button"
                  onClick={() => shiftPeriod(-1)}
                  aria-label="Previous period"
                  className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-3 text-xs font-semibold tracking-tight text-foreground border-x border-border/80 h-full flex items-center bg-card/25 min-w-[170px] justify-center select-none font-mono">
                  {periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo)}
                </span>
                <button
                  type="button"
                  onClick={() => shiftPeriod(1)}
                  aria-label="Next period"
                  className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-9 px-4 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 font-mono shadow-sm"
                  >
                    <CalendarDays className="size-4 text-muted-foreground" />
                    {periodLabel(periodMode, dateRange.dateFrom, dateRange.dateTo)}
                  </button>
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
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={pendingExport !== null || reportQuery.isLoading || optionsQuery.isLoading}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pendingExport === 'xlsx' ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={pendingExport !== null || reportQuery.isLoading || optionsQuery.isLoading}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pendingExport === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={pendingExport !== null || reportQuery.isLoading || optionsQuery.isLoading}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pendingExport === 'csv' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              CSV
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

        {/* Band 2: Filters — search + project select + employee multi-select + clear */}
        <div className="flex items-center gap-3 border-t border-black/[0.04] px-8 py-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <Input
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              className="h-9 pl-9 border border-neutral-200 bg-surface focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
            />
          </div>
          <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[180px] justify-between border border-neutral-200 bg-surface text-sm font-normal text-neutral-700"
              >
                {projectId === ALL_PROJECTS ? 'All Projects' : (selectedProject?.name ?? 'All Projects')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandEmpty>No projects found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value={ALL_PROJECTS}
                      onSelect={() => {
                        handleProjectChange(ALL_PROJECTS);
                        setProjectFilterOpen(false);
                      }}
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        projectId === ALL_PROJECTS ? "bg-primary border-primary" : "border-neutral-300",
                      )}>
                        {projectId === ALL_PROJECTS && <Check className="h-3 w-3 text-white" />}
                      </div>
                      All Projects
                    </CommandItem>
                    {(optionsQuery.data?.projects ?? []).map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.id}
                        onSelect={() => {
                          handleProjectChange(project.id);
                          setProjectFilterOpen(false);
                        }}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          projectId === project.id ? "bg-primary border-primary" : "border-neutral-300",
                        )}>
                          {projectId === project.id && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {project.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={employeeFilterOpen} onOpenChange={setEmployeeFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-[220px] justify-between border border-neutral-200 bg-surface text-sm font-normal text-neutral-700"
              >
                {effectiveSelectedEmployeeIds.length > 0
                  ? `${effectiveSelectedEmployeeIds.length} employee${effectiveSelectedEmployeeIds.length > 1 ? 's' : ''} selected`
                  : 'All Employees'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {eligibleEmployees.map((emp) => (
                      <CommandItem
                        key={emp.id}
                        onSelect={() => toggleEmployee(emp.id, !effectiveSelectedEmployeeIds.includes(emp.id))}
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-neutral-300",
                          effectiveSelectedEmployeeIds.includes(emp.id) && "bg-primary border-primary",
                        )}>
                          {effectiveSelectedEmployeeIds.includes(emp.id) && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="truncate">{emp.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              className="h-9 px-3 text-[13px] text-neutral-500 hover:text-neutral-700"
            >
              <X className="size-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {reportQuery.isError && (
          <div className="border-b border-black/[0.04] bg-destructive-bg px-5 py-3 text-sm text-destructive-text">
            Failed to load attendance report.
          </div>
        )}

        {viewMode === 'report' ? (
          <ReportTable
            rows={searchFilteredRows}
            isLoading={reportQuery.isLoading || optionsQuery.isLoading}
          />
        ) : (
          <>
            <TimesheetGrid
              orgSlug={orgSlug}
              memberId={memberId}
              rows={searchFilteredRows}
              employees={paginatedTimesheetEmployees}
              dateFrom={dateRange.dateFrom}
              dateTo={dateRange.dateTo}
              isLoading={reportQuery.isLoading || optionsQuery.isLoading}
              canEdit={canEdit}
            />
            <div className="border-t border-black/[0.04] px-6 py-4">
              <EmployeePagination
                page={timesheetPage}
                totalPages={timesheetTotalPages}
                total={timesheetTotalEmployees}
                pageSize={timesheetPageSize}
                onPageChange={handleTimesheetPageChange}
                onPageSizeChange={handleTimesheetPageSizeChange}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
