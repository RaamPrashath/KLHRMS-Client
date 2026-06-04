"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isToday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useApiClient } from "@/hooks/useApiClient";
import { useEmployeesQuery } from "@/modules/employees/hooks/useEmployeesQuery";
import { useAttendanceQuery } from "@/modules/attendance/hooks/queries/attendance";
import type { AttendanceRecord } from "@/modules/attendance/types/attendanceTypes";
import { getCurrentWeekState, getWeekDays, getWeekRangeLabel, shiftWeek } from "@/modules/weekly-plan/date";
import { PLAN_LOCATION_MAP, PLAN_LOCATION_THEMES } from "@/modules/weekly-plan/locations";
import type { WeeklyPlanEntry } from "@/hooks/functions/weekly_plan";
import type { PlanLocationValue } from "@/modules/weekly-plan/locations";
import { cn } from "@/lib/utils";

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

function EmployeeCell({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
        {initials}
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

// ─── CSV Export ───────────────────────────────────────────────────────────────

function buildCsv(rows: EmployeeWeekRow[], weekDays: { iso: string; label: string }[]): string {
  const headers = ["Employee", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const loc = (v: PlanLocationValue | null) => (v ? PLAN_LOCATION_MAP[v].label : "Not set");
    lines.push([`"${row.name}"`, loc(row.mon), loc(row.tue), loc(row.wed), loc(row.thu), loc(row.fri)].join(","));
  }
  return lines.join("\n");
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
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
  const [weekState, setWeekState] = useState(getCurrentWeekState);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const auth = useApiClient(orgId);

  const teamQuery = useTeamWeeklyPlanQuery(
    orgSlug,
    orgId,
    memberId,
    weekState.year,
    weekState.week,
    true,
  );

  const { data: employeeData } = useEmployeesQuery(orgSlug, memberId, { pageSize: 200 });

  // Build user_id → member_id mapping for attendance lookup
  const userIdToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    if (!employeeData?.items) return map;
    for (const emp of employeeData.items) {
      map.set(emp.user_id, emp.member_id);
    }
    return map;
  }, [employeeData]);

  const weekDays = useMemo(() => getWeekDays(weekState.year, weekState.week), [weekState.year, weekState.week]);

  // Fetch attendance for the week
  const dateFrom = weekDays[0]?.iso ?? "";
  const dateTo = weekDays[4]?.iso ?? "";
  const attendanceQuery = useAttendanceQuery(orgSlug, memberId, {
    dateFrom: dateFrom,
    dateTo: dateTo,
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
    for (const [userId, memberId] of userIdToMemberId) {
      const memberAttendance = attendanceByEmployee.get(memberId);
      if (memberAttendance) {
        map.set(userId, memberAttendance);
      }
    }
    return map;
  }, [attendanceByEmployee, userIdToMemberId]);

  const rows = useMemo(() => {
    return buildRows(teamQuery.data ?? [], weekDays, employeeData?.items);
  }, [teamQuery.data, weekDays, employeeData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  function changeWeek(delta: number) {
    setWeekState((current) => shiftWeek(current.year, current.week, delta));
    setPage(1);
  }

  function handleExportCsv() {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const csv = buildCsv(rows, weekDays);
    triggerDownload(csv, `team-plans-week-${weekState.week}.csv`, "text/csv;charset=utf-8;");
    toast.success("CSV exported");
  }

  const isLoading = teamQuery.isLoading || !auth;

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            {/* Search */}
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

            {/* Member count */}
            {!isLoading && rows.length > 0 && (
              <p className="text-[13px] font-medium text-neutral-500 whitespace-nowrap">
                <span className="font-semibold text-neutral-900">{filteredRows.length}</span> team member{filteredRows.length === 1 ? "" : "s"}
              </p>
            )}

            {/* Spacer to push next section right */}
            <div className="flex-1" />

            {/* Week nav + Export */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeWeek(-1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[13px] font-semibold text-neutral-800 min-w-[120px] text-center tabular-nums">
                  Week {weekState.week} · {getWeekRangeLabel(weekState.year, weekState.week)}
                </span>
                <button
                  type="button"
                  onClick={() => changeWeek(1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mx-1 h-5 w-px bg-neutral-200" />
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.95] disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Export team plans as CSV"
              >
                <FileDown className="size-3.5" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Pivot table */}
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
                    <TableHead
                      key={d.iso}
                      className="px-2 py-2.5 text-center whitespace-nowrap min-w-[80px]"
                    >
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
                    const weekDates = ["mon", "tue", "wed", "thu", "fri"].map((key, idx) => ({
                      key,
                      planned: row[key as keyof Pick<EmployeeWeekRow, "mon" | "tue" | "wed" | "thu" | "fri">] as PlanLocationValue | null,
                      date: weekDays[idx]?.iso ?? "",
                    }));
                    const hasMismatch = weekDates.some(({ planned, date }) => {
                      const d = parseISO(date);
                      const isFuture = d > new Date(new Date().setHours(0, 0, 0, 0));
                      if (isFuture) return false;
                      return isMismatch(planned, employeeAttendance?.get(date)?.status ?? null);
                    });
                    return [
                      // Row 1: Employee name + Planned badges
                      <tr
                        key={`${row.userId}-plan`}
                        className={cn(
                          "transition-colors duration-100",
                          hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60",
                        )}
                      >
                        <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-neutral-100 border-b border-neutral-200 w-[200px] max-w-[200px] overflow-hidden" rowSpan={2}>
                          <div className="flex items-center gap-2">
                            <EmployeeCell name={row.name} />
                            {hasMismatch && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                  Plan vs Actual mismatch detected
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        {weekDates.map(({ key, planned }) => {
                          return (
                            <td
                              key={key}
                              className="px-2 py-2 text-center border-b border-neutral-200"
                            >
                              <div className="flex items-center justify-center">
                                <LocationBadge location={planned} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>,
                      // Row 2: Actual badges
                      <tr
                        key={`${row.userId}-actual`}
                        className={cn(
                          "transition-colors duration-100 border-b border-neutral-200",
                          hasMismatch ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-canvas/60",
                        )}
                      >
                        {weekDates.map(({ key, date }) => {
                          const d = parseISO(date);
                          const today = isToday(d);
                          const isFuture = d > new Date(new Date().setHours(0, 0, 0, 0));
                          const actualRecord = employeeAttendance?.get(date);
                          const planned = weekDates.find((w) => w.key === key)?.planned ?? null;
                          const mismatch = !isFuture && isMismatch(planned, actualRecord?.status ?? null);
                          return (
                            <td
                              key={key}
                              className={cn(
                                "px-2 py-2 text-center",
                                today && "bg-primary/3",
                              )}
                            >
                              {isFuture ? (
                                <span className="text-[10px] font-medium text-neutral-200">—</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <ActualLocationBadge record={actualRecord} />
                                  {mismatch && (
                                    <AlertCircle className="size-2.5 text-red-400 shrink-0" />
                                  )}
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
        </div>

        {/* Pagination — inside the card */}
        {!isLoading && filteredRows.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-black/[0.04] flex items-center justify-between">
            <p className="text-[13px] font-medium text-neutral-500">
              Showing <span className="font-semibold text-neutral-900">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-neutral-900">{Math.min(page * PAGE_SIZE, filteredRows.length)}</span> of <span className="font-semibold text-neutral-900">{filteredRows.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
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
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className={cn("min-w-9", page === p && "bg-primary text-white")}
                      >
                        {p}
                      </Button>
                    ),
                  );
                })()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
