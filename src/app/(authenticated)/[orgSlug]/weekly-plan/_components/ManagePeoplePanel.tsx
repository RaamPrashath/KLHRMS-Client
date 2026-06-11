"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertCircle,
} from "lucide-react";
import { format as dateFnsFormat, parseISO, isToday } from "date-fns";
import { toast } from "sonner";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTeamWeeklyPlanQuery, useTeamMonthlyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useApiClient } from "@/hooks/useApiClient";
import { useEmployeesQuery } from "@/modules/employees/hooks/useEmployeesQuery";
import { useAttendanceQuery } from "@/modules/attendance/hooks/queries/attendance";
import type { AttendanceRecord } from "@/modules/attendance/types/attendanceTypes";
import {
  getCurrentWeekState,
  getCurrentMonthState,
  getWeekDays,
  getWeekRangeLabel,
  getMonthLabel,
  shiftWeek,
  shiftMonth,
  getMonthWeekdayDates,
} from "@/modules/weekly-plan/date";
import { PLAN_LOCATION_MAP, PLAN_LOCATION_THEMES } from "@/modules/weekly-plan/locations";
import type { WeeklyPlanEntry } from "@/hooks/functions/weekly_plan";
import type { PlanLocationValue } from "@/modules/weekly-plan/locations";
import type {
  PlanExportFormat,
  PlanExportPayload,
  PlanExportRow,
  PlanExportPivotDay,
  PlanExportPivotRow,
} from "@/modules/weekly-plan/types";
import { exportWeeklyPlanReportAction } from "@/modules/weekly-plan/api/exportWeeklyPlanReportAction";
import { cn } from "@/lib/utils";

type PlanTeamView = "weekly" | "monthly";

const PAGE_SIZE = 15;

interface ManagePeoplePanelProps {
  orgSlug: string;
  orgId: string;
  memberId: string;
}

interface EmployeeWeekRow {
  userId: string;
  name: string;
  mon: PlanLocationValue | null;
  tue: PlanLocationValue | null;
  wed: PlanLocationValue | null;
  thu: PlanLocationValue | null;
  fri: PlanLocationValue | null;
}

function groupTeamByUser(entries: WeeklyPlanEntry[]): Record<string, { name: string; byDate: Map<string, PlanLocationValue> }> {
  const result: Record<string, { name: string; byDate: Map<string, PlanLocationValue> }> = {};
  for (const entry of entries) {
    if (!result[entry.user_id]) {
      result[entry.user_id] = { name: entry.user_name ?? entry.user_id, byDate: new Map() };
    }
    result[entry.user_id].byDate.set(entry.date, entry.work_location);
  }
  return result;
}

function buildRows(entries: WeeklyPlanEntry[], weekDays: { iso: string }[], allEmployees?: { member_id: string; user_id: string; name: string }[]): EmployeeWeekRow[] {
  const grouped = groupTeamByUser(entries);
  const map = new Map<string, EmployeeWeekRow>();

  if (allEmployees) {
    for (const emp of allEmployees) {
      map.set(emp.user_id, {
        userId: emp.user_id,
        name: emp.name || "Unknown",
        mon: null, tue: null, wed: null, thu: null, fri: null,
      });
    }
  }

  for (const [userId, data] of Object.entries(grouped)) {
    if (!map.has(userId)) {
      map.set(userId, {
        userId,
        name: data.name,
        mon: null, tue: null, wed: null, thu: null, fri: null,
      });
    }
    const row = map.get(userId)!;
    row.name = data.name;
    row.mon = data.byDate.get(weekDays[0]?.iso ?? "") ?? null;
    row.tue = data.byDate.get(weekDays[1]?.iso ?? "") ?? null;
    row.wed = data.byDate.get(weekDays[2]?.iso ?? "") ?? null;
    row.thu = data.byDate.get(weekDays[3]?.iso ?? "") ?? null;
    row.fri = data.byDate.get(weekDays[4]?.iso ?? "") ?? null;
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function LocationBadge({ location }: { location: PlanLocationValue | null }) {
  if (!location) {
    return <span className="text-[10px] font-medium text-neutral-300">—</span>;
  }
  const theme = PLAN_LOCATION_THEMES[location];
  const label = PLAN_LOCATION_MAP[location].short_label;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", theme.bg, theme.text)}>
      <span className={cn("size-1.5 rounded-full", theme.dot)} />
      {label}
    </span>
  );
}

function ActualLocationBadge({ record }: { record: AttendanceRecord | undefined }) {
  if (!record) {
    return <span className="text-[10px] font-medium text-neutral-300">—</span>;
  }
  if (record.isRemote) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700">
        <span className="size-1.5 rounded-full bg-blue-500" />
        WFH
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700">
      <span className="size-1.5 rounded-full bg-teal-500" />
      OFF
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function EmployeeCell({ name }: { name: string }) {
  const empInitials = initials(name);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
        {empInitials}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <span className="text-[13px] font-medium text-neutral-900 leading-tight truncate" title={name}>
          {name}
        </span>
        <span className="text-[11px] text-neutral-400 leading-tight">No Dept</span>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ─── TabSlider ────────────────────────────────────────────────────────────────

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

// ─── Monthly Plan Pivot Table ────────────────────────────────────────────────

function MonthlyPlanTable({
  pivotRows,
  weekDays,
  isLoading,
  search,
}: {
  pivotRows: PlanExportPivotRow[];
  weekDays: { iso: string }[];
  isLoading: boolean;
  search: string;
}) {
  const rows = useMemo(() => {
    if (!search.trim()) return pivotRows;
    const q = search.toLowerCase();
    return pivotRows.filter((r) => r.name.toLowerCase().includes(q));
  }, [pivotRows, search]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="overflow-x-auto w-full">
        <Table style={{ minWidth: 640 }}>
          <TableHeader>
            <TableRow className="bg-canvas/60 border-b border-neutral-200 hover:bg-canvas/60">
              <TableHead className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap w-[200px] max-w-[200px] sticky left-0 bg-[#f5f5f7] z-10">
                Employee
              </TableHead>
              {weekDays.map((d) => {
                const date = parseISO(d.iso);
                return (
                  <TableHead key={d.iso} className="px-2 py-2.5 text-center whitespace-nowrap min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        {dateFnsFormat(date, "MMM d")}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-widest text-neutral-400">
                        {dateFnsFormat(date, "EEE")}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className={cn("border-b border-neutral-100", i % 2 === 0 && "bg-neutral-50/30")}>
                <TableCell className="px-4 py-3 sticky left-0 bg-white z-10 min-w-[180px]">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                    <div className="h-2 w-10 animate-pulse rounded bg-neutral-100" />
                  </div>
                </TableCell>
                {weekDays.map((_, j) => (
                  <TableCell key={j} className="px-2 py-3 text-center">
                    <div className="h-10 w-14 animate-pulse rounded-md bg-neutral-100 mx-auto" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="overflow-x-auto w-full">
        <Table style={{ minWidth: 640 }}>
          <TableHeader>
            <TableRow className="bg-canvas/60 border-b border-neutral-200 hover:bg-canvas/60">
              <TableHead className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Employee</TableHead>
              {weekDays.map((d) => {
                const date = parseISO(d.iso);
                return (
                  <TableHead key={d.iso} className="px-2 py-2.5 text-center whitespace-nowrap min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{dateFnsFormat(date, "MMM d")}</span>
                      <span className="text-[9px] font-medium uppercase tracking-widest text-neutral-400">{dateFnsFormat(date, "EEE")}</span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={weekDays.length + 1} className="py-16 text-center text-sm text-neutral-400">
                {search ? "No entries match your search." : "No monthly plan entries found."}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table style={{ minWidth: 640 }}>
        <TableHeader>
          <TableRow className="bg-canvas/60 border-b border-neutral-200 hover:bg-canvas/60">
            <TableHead className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap w-[200px] max-w-[200px] sticky left-0 bg-[#f5f5f7] z-10">
              Employee
            </TableHead>
            {weekDays.map((d) => {
              const date = parseISO(d.iso);
              const today = isToday(date);
              return (
                <TableHead key={d.iso} className="px-2 py-2.5 text-center whitespace-nowrap min-w-[80px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", today ? "text-primary" : "text-neutral-500")}>
                      {dateFnsFormat(date, "MMM d")}
                    </span>
                    <span className={cn("text-[9px] font-medium uppercase tracking-widest", today ? "text-primary/70" : "text-neutral-400")}>
                      {dateFnsFormat(date, "EEE")}
                    </span>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TooltipProvider>
            {pagedRows.map((row) => {
              const hasMismatch = row.days.some((d) => {
                if (!d.planned || !d.actualLocation) return false;
                return d.planned !== d.actualLocation && d.actualLocation !== null;
              });
              return [
                <tr key={`${row.userId}-plan`} className={cn("transition-colors duration-100", hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60")}>
                  <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-neutral-100 border-b border-neutral-200 w-[200px] max-w-[200px] overflow-hidden" rowSpan={2}>
                    <div className="flex items-center gap-2">
                      <EmployeeCell name={row.name} />
                      {hasMismatch && (
                        <Tooltip>
                          <TooltipTrigger asChild><AlertCircle className="size-3.5 shrink-0 text-red-400" /></TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">Plan vs Actual mismatch detected</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  {row.days.map((d) => (
                    <td key={d.iso} className="px-2 py-2 text-center border-b border-neutral-200">
                      <div className="flex items-center justify-center"><LocationBadge location={d.planned} /></div>
                    </td>
                  ))}
                </tr>,
                <tr key={`${row.userId}-actual`} className={cn("transition-colors duration-100 border-b border-neutral-200", hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60")}>
                  {row.days.map((d) => {
                    const date = parseISO(d.iso);
                    const today = isToday(date);
                    const isFut = date > new Date(new Date().setHours(0, 0, 0, 0));
                    const mismatch = !isFut && d.planned && d.actualLocation && d.planned !== d.actualLocation;
                    return (
                      <td key={d.iso} className={cn("px-2 py-2 text-center", today && "bg-primary/3")}>
                        {isFut ? (
                          <span className="text-[10px] font-medium text-neutral-200">—</span>
                        ) : d.actualLocation ? (
                          <div className="flex items-center justify-center gap-1">
                            <LocationBadge location={d.actualLocation as PlanLocationValue} />
                            {mismatch && <AlertCircle className="size-2.5 text-red-400 shrink-0" />}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-neutral-200">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>,
              ];
            })}
          </TooltipProvider>
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-black/[0.04] flex items-center justify-between">
          <p className="text-[13px] font-medium text-neutral-500">
            Showing <span className="font-semibold text-neutral-900">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-neutral-900">{Math.min(page * PAGE_SIZE, rows.length)}</span> of <span className="font-semibold text-neutral-900">{rows.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Trigger Download ────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isMismatch(planned: PlanLocationValue | null, actualStatus: string | null): boolean {
  if (!planned || planned === "LEAVE" || planned === "HOLIDAY") return false;
  return actualStatus === "ABSENT" || actualStatus === null;
}

export function ManagePeoplePanel({ orgSlug, orgId, memberId }: ManagePeoplePanelProps) {
  const [viewMode, setViewMode] = useState<PlanTeamView>("weekly");
  const [weekState, setWeekState] = useState(getCurrentWeekState);
  const [monthState, setMonthState] = useState(getCurrentMonthState);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [effectiveSelectedEmployeeIds, setEffectiveSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeFilterOpen, setEmployeeFilterOpen] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<string | null>(null);
  const [customDateTo, setCustomDateTo] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<PlanExportFormat | null>(null);
  const auth = useApiClient(orgId);

  const VIEW_MODES: { mode: PlanTeamView; label: string }[] = [
    { mode: "weekly", label: "Weekly" },
    { mode: "monthly", label: "Monthly" },
  ];

  const teamQuery = useTeamWeeklyPlanQuery(
    orgSlug, orgId, memberId, weekState.year, weekState.week,
    viewMode === "weekly",
  );

  const teamMonthQuery = useTeamMonthlyPlanQuery(
    orgSlug, orgId, memberId, monthState.year, monthState.month,
    viewMode === "monthly",
  );

  const activeEntries = useMemo(
    () => (viewMode === "weekly" ? teamQuery.data ?? [] : teamMonthQuery.data ?? []),
    [viewMode, teamQuery.data, teamMonthQuery.data],
  );

  const { data: employeeData } = useEmployeesQuery(orgSlug, memberId);

  // Build user_id → member_id mapping for attendance lookup
  const userIdToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    if (!employeeData?.items) return map;
    for (const emp of employeeData.items) {
      map.set(emp.user_id, emp.member_id);
    }
    return map;
  }, [employeeData]);

  const weekDays = useMemo(() => {
    if (viewMode === "weekly") {
      return getWeekDays(weekState.year, weekState.week);
    }
    const monthDates = getMonthWeekdayDates(monthState.year, monthState.month);
    return monthDates.map((iso) => ({ iso, label: "", date: parseISO(iso) }));
  }, [viewMode, weekState, monthState]);

  const currentDateFrom = customDateFrom || (weekDays[0]?.iso ?? "");
  const currentDateTo = customDateTo || (weekDays[weekDays.length - 1]?.iso ?? "");

  // Fetch attendance for weekly view
  const attendanceQuery = useAttendanceQuery(orgSlug, memberId, {
    dateFrom: weekDays[0]?.iso ?? "",
    dateTo: viewMode === "weekly" ? (weekDays[4]?.iso ?? "") : (weekDays[weekDays.length - 1]?.iso ?? ""),
    page: 1,
    pageSize: 500,
  });

  // Build attendance lookup: employeeId → Map<date, AttendanceRecord>
  const attendanceByEmployee = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceRecord>>();
    if (!attendanceQuery.data?.items) return map;
    for (const rec of attendanceQuery.data.items) {
      if (!map.has(rec.employeeId)) {
        map.set(rec.employeeId, new Map());
      }
      map.get(rec.employeeId)!.set(rec.date, rec);
    }
    return map;
  }, [attendanceQuery.data]);

  // Build user_id → attendance lookup using the mapping
  const attendanceByUserId = useMemo(() => {
    const map = new Map<string, Map<string, AttendanceRecord>>();
    for (const [userId, mid] of userIdToMemberId) {
      const memberAttendance = attendanceByEmployee.get(mid);
      if (memberAttendance) {
        map.set(userId, memberAttendance);
      }
    }
    return map;
  }, [attendanceByEmployee, userIdToMemberId]);

  // Eligible employees for filter (from employee data + plans data)
  const eligibleEmployees = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; email: string | null }[] = [];
    if (employeeData?.items) {
      for (const emp of employeeData.items) {
        if (seen.has(emp.user_id)) continue;
        seen.add(emp.user_id);
        result.push({ id: emp.user_id, name: emp.name, email: null });
      }
    }
    for (const entry of activeEntries) {
      if (!seen.has(entry.user_id)) {
        seen.add(entry.user_id);
        result.push({ id: entry.user_id, name: entry.user_name ?? entry.user_id, email: null });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEntries, employeeData]);

  // Build weekly pivot rows
  const rows = useMemo(() => {
    if (viewMode !== "weekly") return [];
    return buildRows(teamQuery.data ?? [], weekDays, employeeData?.items);
  }, [viewMode, teamQuery.data, weekDays, employeeData]);

  const filteredRows = useMemo(() => {
    if (viewMode !== "weekly") return [];
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (effectiveSelectedEmployeeIds.length > 0) {
      const selectedSet = new Set(effectiveSelectedEmployeeIds);
      list = list.filter((r) => selectedSet.has(r.userId));
    }
    return list;
  }, [viewMode, rows, search, effectiveSelectedEmployeeIds]);

  // Filtered monthly entries
  const filteredMonthlyEntries = useMemo(() => {
    if (viewMode !== "monthly") return [];
    let list = activeEntries;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.user_name?.toLowerCase().includes(q));
    }
    if (effectiveSelectedEmployeeIds.length > 0) {
      const selectedSet = new Set(effectiveSelectedEmployeeIds);
      list = list.filter((r) => selectedSet.has(r.user_id));
    }
    return list;
  }, [viewMode, activeEntries, search, effectiveSelectedEmployeeIds]);

  // Monthly pivot rows (same pivot format as weekly)
  const monthlyPivotRows = useMemo(() => {
    if (viewMode !== "monthly") return [];
    const byUser = new Map<string, Map<string, PlanLocationValue>>();
    for (const entry of filteredMonthlyEntries) {
      if (!byUser.has(entry.user_id)) byUser.set(entry.user_id, new Map());
      byUser.get(entry.user_id)!.set(entry.date, entry.work_location);
    }
    const seen = new Set<string>();
    return eligibleEmployees
      .filter((e) => seen.has(e.id) ? false : (seen.add(e.id), true))
      .map((emp) => ({
        userId: emp.id,
        name: emp.name,
        days: weekDays.map((d) => {
          const parsed = parseISO(d.iso);
          const userAttendance = attendanceByUserId.get(emp.id);
          const record = userAttendance?.get(d.iso);
          const actualLocation = record ? (record.isRemote ? "WFH" : "OFFICE") : null;
          return {
            iso: d.iso,
            dayLabel: dateFnsFormat(parsed, "EEEE"),
            dateLabel: dateFnsFormat(parsed, "MMM d"),
            planned: byUser.get(emp.id)?.get(d.iso) ?? null,
            actualLocation,
          } satisfies PlanExportPivotDay;
        }),
      }));
  }, [viewMode, filteredMonthlyEntries, weekDays, attendanceByUserId, eligibleEmployees]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  function changeWeek(delta: number) {
    setWeekState((current) => shiftWeek(current.year, current.week, delta));
    setCustomDateFrom(null);
    setCustomDateTo(null);
    setPage(1);
  }

  function changeMonth(delta: number) {
    setMonthState((current) => shiftMonth(current.year, current.month, delta));
    setCustomDateFrom(null);
    setCustomDateTo(null);
    setPage(1);
  }

  function toggleEmployee(employeeId: string, add: boolean) {
    setEffectiveSelectedEmployeeIds((prev) =>
      add ? [...prev, employeeId] : prev.filter((id) => id !== employeeId),
    );
  }

  const hasActiveFilters = effectiveSelectedEmployeeIds.length > 0 || search.trim() !== "";

  function clearFilters() {
    setEffectiveSelectedEmployeeIds([]);
    setSearch("");
  }

  function buildPivotExportData(
    filteredRows_: PlanExportRow[],
    days: { iso: string }[],
    attendanceByUserId: Map<string, Map<string, AttendanceRecord>>,
  ): PlanExportPivotRow[] {
    const byUser = new Map<string, Map<string, PlanLocationValue | null>>();
    for (const r of filteredRows_) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
      byUser.get(r.user_id)!.set(r.date, r.work_location);
    }

    const seen = new Set<string>();
    return eligibleEmployees
      .filter((e) => seen.has(e.id) ? false : (seen.add(e.id), true))
      .map((emp) => ({
        userId: emp.id,
        name: emp.name,
        days: days.map((d) => {
          const parsed = parseISO(d.iso);
          const userAttendance = attendanceByUserId.get(emp.id);
          const record = userAttendance?.get(d.iso);
          const actualLocation = record ? (record.isRemote ? "WFH" : "OFFICE") : null;
          return {
            iso: d.iso,
            dayLabel: dateFnsFormat(parsed, "EEEE"),
            dateLabel: dateFnsFormat(parsed, "MMM d"),
            planned: byUser.get(emp.id)?.get(d.iso) ?? null,
            actualLocation,
          } satisfies PlanExportPivotDay;
        }),
      }));
  }

  async function handleExport(format: PlanExportFormat) {
    if (pendingExport) return;
    if (activeEntries.length === 0) {
      toast.error("No data to export");
      return;
    }

    const employeesForExport = effectiveSelectedEmployeeIds.length > 0
      ? eligibleEmployees.filter((emp) => effectiveSelectedEmployeeIds.includes(emp.id))
      : eligibleEmployees;

    if (employeesForExport.length === 0) {
      toast.error("Select at least one visible employee to export.");
      return;
    }

    const employeeIdSet = new Set(employeesForExport.map((e) => e.id));
    const rowsForExport: PlanExportRow[] = activeEntries
      .filter((entry) => employeeIdSet.has(entry.user_id))
      .map((entry) => ({
        user_id: entry.user_id,
        user_name: entry.user_name,
        date: entry.date,
        work_location: entry.work_location,
        project: entry.project,
      }));

    if (rowsForExport.length === 0) {
      toast.error("No plan entries match the current selection.");
      return;
    }

    setPendingExport(format);
    try {
      const title = viewMode === "weekly"
        ? `Team Plans - Week ${weekState.week}`
        : `Team Plans - ${getMonthLabel(monthState.year, monthState.month)}`;

      const label = viewMode === "weekly"
        ? getWeekRangeLabel(weekState.year, weekState.week)
        : getMonthLabel(monthState.year, monthState.month);

      const isMonthlyView = viewMode === "monthly";
      const pivot = isMonthlyView
        ? monthlyPivotRows.filter((r) => employeeIdSet.has(r.userId))
        : buildPivotExportData(rowsForExport, weekDays, attendanceByUserId);
      const payload: PlanExportPayload = {
        format,
        title,
        periodLabel: label,
        viewMode: isMonthlyView ? "monthly_pivot" : "weekly",
        employees: employeesForExport.map((emp) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
        })),
        rows: isMonthlyView ? rowsForExport : undefined,
        pivotData: pivot,
      };

      const blob = await exportWeeklyPlanReportAction({ orgSlug, memberId, payload });
      const ext = format;
      const filename = `team-plans-${viewMode}-${label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.${ext}`;
      triggerDownload(blob, filename);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setPendingExport(null);
    }
  }

  const isLoading = (viewMode === "weekly" ? teamQuery.isLoading : teamMonthQuery.isLoading) || !auth;

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* Band 1: View toggle + period nav + export buttons */}
        <div className="flex flex-wrap items-center gap-3 px-7 py-4 border-b border-black/[0.04]">
          <TabSlider modes={VIEW_MODES} activeMode={viewMode} onChange={(mode) => { setViewMode(mode); setCustomDateFrom(null); setCustomDateTo(null); setPage(1); }} />

          <div className="flex items-center gap-1">
            {viewMode === "weekly" ? (
              <>
                <button type="button" onClick={() => changeWeek(-1)} aria-label="Previous week"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[13px] font-semibold text-neutral-800 min-w-[140px] text-center tabular-nums select-none">
                  Week {weekState.week} · {getWeekRangeLabel(weekState.year, weekState.week)}
                </span>
                <button type="button" onClick={() => changeWeek(1)} aria-label="Next week"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[13px] font-semibold text-neutral-800 min-w-[140px] text-center tabular-nums select-none">
                  {getMonthLabel(monthState.year, monthState.month)}
                </span>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Date range popover */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="h-8 px-3 text-[13px] font-semibold rounded-lg border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50 transition-all flex items-center gap-2 font-mono shadow-sm">
                <CalendarDays className="size-3.5 text-neutral-400" />
                {currentDateFrom === currentDateTo && currentDateFrom === (weekDays[0]?.iso ?? "") && currentDateTo === (weekDays[weekDays.length - 1]?.iso ?? "")
                  ? "Custom"
                  : `${currentDateFrom} — ${currentDateTo}`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: customDateFrom ? parseISO(customDateFrom) : undefined,
                  to: customDateTo ? parseISO(customDateTo) : undefined,
                }}
                onSelect={(range: DateRange | undefined) => {
                  if (range?.from) setCustomDateFrom(range.from.toISOString().slice(0, 10));
                  if (range?.to) setCustomDateTo(range.to.toISOString().slice(0, 10));
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => handleExport("xlsx")} disabled={pendingExport !== null}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {pendingExport === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              Excel
            </button>
            <button type="button" onClick={() => handleExport("pdf")} disabled={pendingExport !== null}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {pendingExport === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              PDF
            </button>
            <button type="button" onClick={() => handleExport("csv")} disabled={pendingExport !== null}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {pendingExport === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              CSV
            </button>
          </div>
        </div>

        {/* Band 2: Search + employee filter + clear */}
        <div className="flex items-center gap-3 border-t border-black/[0.04] px-7 py-4">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
            />
          </div>

          <Popover open={employeeFilterOpen} onOpenChange={setEmployeeFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-[220px] justify-between border border-neutral-200 bg-surface text-sm font-normal text-neutral-700">
                {effectiveSelectedEmployeeIds.length > 0
                  ? `${effectiveSelectedEmployeeIds.length} employee${effectiveSelectedEmployeeIds.length > 1 ? "s" : ""} selected`
                  : "All Employees"}
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
                      <CommandItem key={emp.id} onSelect={() => toggleEmployee(emp.id, !effectiveSelectedEmployeeIds.includes(emp.id))}>
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
            <Button type="button" variant="ghost" onClick={clearFilters} className="h-9 px-3 text-[13px] text-neutral-500 hover:text-neutral-700">
              <X className="size-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        {viewMode === "weekly" ? (
          /* Weekly pivot table */
          <div className="overflow-x-auto w-full">
            <Table style={{ minWidth: 640 }}>
              <TableHeader>
                <TableRow className="bg-canvas/60 border-b border-neutral-200 hover:bg-canvas/60">
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap w-[200px] max-w-[200px] sticky left-0 bg-[#f5f5f7] z-10">
                    Employee
                  </TableHead>
                  {weekDays.map((d) => {
                    const date = parseISO(d.iso);
                    const today = isToday(date);
                    return (
                      <TableHead key={d.iso} className="px-2 py-2.5 text-center whitespace-nowrap min-w-[80px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wider", today ? "text-primary" : "text-neutral-500")}>
                            {`${MONTH_NAMES[date.getMonth()]!.slice(0, 3)} ${date.getDate()}`}
                          </span>
                          <span className={cn("text-[9px] font-medium uppercase tracking-widest", today ? "text-primary/70" : "text-neutral-400")}>
                            {DAY_ABBR[date.getDay()]}
                          </span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className={cn("border-b border-neutral-100", i % 2 === 0 && "bg-neutral-50/30")}>
                      <TableCell className="px-4 py-3 sticky left-0 bg-white z-10 min-w-[180px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                          <div className="h-2 w-10 animate-pulse rounded bg-neutral-100" />
                        </div>
                      </TableCell>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j} className="px-2 py-3 text-center">
                          <div className="h-10 w-14 animate-pulse rounded-md bg-neutral-100 mx-auto" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-sm text-neutral-400">
                      {search ? "No team members match your search." : "No team plans found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TooltipProvider>
                    {pagedRows.map((row) => {
                      const employeeAttendance = attendanceByUserId.get(row.userId);
                      const weekDatesTuple = ["mon", "tue", "wed", "thu", "fri"].map((key, idx) => ({
                        key,
                        planned: row[key as keyof Pick<EmployeeWeekRow, "mon" | "tue" | "wed" | "thu" | "fri">] as PlanLocationValue | null,
                        date: weekDays[idx]?.iso ?? "",
                      }));
                      const hasMismatch = weekDatesTuple.some(({ planned, date }) => {
                        const d = parseISO(date);
                        const isFut = d > new Date(new Date().setHours(0, 0, 0, 0));
                        if (isFut) return false;
                        return isMismatch(planned, employeeAttendance?.get(date)?.status ?? null);
                      });
                      return [
                        <tr key={`${row.userId}-plan`} className={cn("transition-colors duration-100", hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60")}>
                          <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-neutral-100 border-b border-neutral-200 w-[200px] max-w-[200px] overflow-hidden" rowSpan={2}>
                            <div className="flex items-center gap-2">
                              <EmployeeCell name={row.name} />
                              {hasMismatch && (
                                <Tooltip>
                                  <TooltipTrigger asChild><AlertCircle className="size-3.5 shrink-0 text-red-400" /></TooltipTrigger>
                                  <TooltipContent side="right" className="text-xs">Plan vs Actual mismatch detected</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                          {weekDatesTuple.map(({ key, planned }) => (
                            <td key={key} className="px-2 py-2 text-center border-b border-neutral-200">
                              <div className="flex items-center justify-center"><LocationBadge location={planned} /></div>
                            </td>
                          ))}
                        </tr>,
                        <tr key={`${row.userId}-actual`} className={cn("transition-colors duration-100 border-b border-neutral-200", hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60")}>
                          {weekDatesTuple.map(({ key, date }) => {
                            const d = parseISO(date);
                            const today = isToday(d);
                            const isFut = d > new Date(new Date().setHours(0, 0, 0, 0));
                            const actualRecord = employeeAttendance?.get(date);
                            const planned = weekDatesTuple.find((w) => w.key === key)?.planned ?? null;
                            const mismatch = !isFut && isMismatch(planned, actualRecord?.status ?? null);
                            return (
                              <td key={key} className={cn("px-2 py-2 text-center", today && "bg-primary/3")}>
                                {isFut ? (
                                  <span className="text-[10px] font-medium text-neutral-200">—</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <ActualLocationBadge record={actualRecord} />
                                    {mismatch && <AlertCircle className="size-2.5 text-red-400 shrink-0" />}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>,
                      ];
                    })}
                  </TooltipProvider>
                )}
              </TableBody>
            </Table>
            {!isLoading && filteredRows.length > 0 && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-black/[0.04] flex items-center justify-between">
                <p className="text-[13px] font-medium text-neutral-500">
                  Showing <span className="font-semibold text-neutral-900">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-neutral-900">{Math.min(page * PAGE_SIZE, filteredRows.length)}</span> of <span className="font-semibold text-neutral-900">{filteredRows.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages: (number | "...")[] = [];
                      const startPage = Math.max(1, page - 2);
                      const endPage = Math.min(totalPages, page + 2);
                      if (startPage > 1) pages.push(1);
                      if (startPage > 2) pages.push("...");
                      for (let i = startPage; i <= endPage; i++) pages.push(i);
                      if (endPage < totalPages - 1) pages.push("...");
                      if (endPage < totalPages) pages.push(totalPages);
                      return pages.map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-[13px] text-neutral-400">…</span>
                        ) : (
                          <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p)}
                            className={cn("min-w-9", page === p && "bg-primary text-white")}>{p}</Button>
                        ),
                      );
                    })()}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Monthly pivot table */
          <MonthlyPlanTable
            pivotRows={monthlyPivotRows}
            weekDays={weekDays}
            isLoading={isLoading}
            search={search}
          />
        )}
      </div>
    </div>
  );
}
