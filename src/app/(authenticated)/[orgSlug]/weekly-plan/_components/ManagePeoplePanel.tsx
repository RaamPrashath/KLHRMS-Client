"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, CalendarDays, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useApiClient } from "@/hooks/useApiClient";
import { getCurrentWeekState, getWeekDays, getWeekRangeLabel, getWeekStart, shiftWeek } from "@/modules/weekly-plan/date";
import { PLAN_LOCATION_MAP, PLAN_LOCATION_THEMES } from "@/modules/weekly-plan/locations";
import type { WeeklyPlanEntry } from "@/hooks/functions/weekly_plan";
import type { PlanLocationValue } from "@/modules/weekly-plan/locations";
import { cn } from "@/lib/utils";

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

function buildRows(entries: WeeklyPlanEntry[], weekDays: { iso: string }[]): EmployeeWeekRow[] {
  const grouped = groupTeamByUser(entries);
  return Object.entries(grouped).map(([userId, data]) => ({
    userId,
    name: data.name,
    mon: data.byDate.get(weekDays[0]?.iso ?? "") ?? null,
    tue: data.byDate.get(weekDays[1]?.iso ?? "") ?? null,
    wed: data.byDate.get(weekDays[2]?.iso ?? "") ?? null,
    thu: data.byDate.get(weekDays[3]?.iso ?? "") ?? null,
    fri: data.byDate.get(weekDays[4]?.iso ?? "") ?? null,
  }));
}

function LocationBadge({ location }: { location: PlanLocationValue | null }) {
  if (!location) {
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-canvas px-2 py-1 text-[11px] font-medium text-ink-muted-48">
        —
      </span>
    );
  }
  const theme = PLAN_LOCATION_THEMES[location];
  const label = PLAN_LOCATION_MAP[location].short_label;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", theme.bg, theme.text)}>
      <span className={cn("size-1.5 rounded-full", theme.dot)} />
      {label}
    </span>
  );
}

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

const columnHelper = createColumnHelper<EmployeeWeekRow>();

export function ManagePeoplePanel({ orgSlug, orgId, memberId }: ManagePeoplePanelProps) {
  const [weekState, setWeekState] = useState(getCurrentWeekState);
  const auth = useApiClient(orgId);

  const teamQuery = useTeamWeeklyPlanQuery(
    orgSlug,
    orgId,
    memberId,
    weekState.year,
    weekState.week,
    true,
  );

  const weekDays = useMemo(() => getWeekDays(weekState.year, weekState.week), [weekState.year, weekState.week]);
  const monthLabel = getWeekStart(weekState.year, weekState.week).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const rows = useMemo(() => {
    return buildRows(teamQuery.data ?? [], weekDays);
  }, [teamQuery.data, weekDays]);

  function changeWeek(delta: number) {
    setWeekState((current) => shiftWeek(current.year, current.week, delta));
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

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span className="text-[14px] font-semibold text-neutral-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("mon", {
        header: () => (
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted-48">Mon</div>
            <div className="text-[13px] font-semibold text-ink">{weekDays[0] ? new Date(weekDays[0].iso).getDate() : ""}</div>
          </div>
        ),
        cell: (info) => <div className="flex justify-center"><LocationBadge location={info.getValue()} /></div>,
      }),
      columnHelper.accessor("tue", {
        header: () => (
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted-48">Tue</div>
            <div className="text-[13px] font-semibold text-ink">{weekDays[1] ? new Date(weekDays[1].iso).getDate() : ""}</div>
          </div>
        ),
        cell: (info) => <div className="flex justify-center"><LocationBadge location={info.getValue()} /></div>,
      }),
      columnHelper.accessor("wed", {
        header: () => (
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted-48">Wed</div>
            <div className="text-[13px] font-semibold text-ink">{weekDays[2] ? new Date(weekDays[2].iso).getDate() : ""}</div>
          </div>
        ),
        cell: (info) => <div className="flex justify-center"><LocationBadge location={info.getValue()} /></div>,
      }),
      columnHelper.accessor("thu", {
        header: () => (
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted-48">Thu</div>
            <div className="text-[13px] font-semibold text-ink">{weekDays[3] ? new Date(weekDays[3].iso).getDate() : ""}</div>
          </div>
        ),
        cell: (info) => <div className="flex justify-center"><LocationBadge location={info.getValue()} /></div>,
      }),
      columnHelper.accessor("fri", {
        header: () => (
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted-48">Fri</div>
            <div className="text-[13px] font-semibold text-ink">{weekDays[4] ? new Date(weekDays[4].iso).getDate() : ""}</div>
          </div>
        ),
        cell: (info) => <div className="flex justify-center"><LocationBadge location={info.getValue()} /></div>,
      }),
    ],
    [weekDays],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const isLoading = teamQuery.isLoading || !auth;

  return (
    <div className="flex flex-col gap-6">
      {/* Header with week navigator and export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-neutral-900 leading-tight tracking-tight">
              {monthLabel}
            </span>
            <span className="text-[11px] font-medium text-neutral-400 mt-0.5">
              Week {weekState.week} · {getWeekRangeLabel(weekState.year, weekState.week)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeWeek(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeWeek(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-1 h-5 w-px bg-hairline" />

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

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-black/[0.04] bg-canvas/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider",
                        header.id !== "name" && "text-center",
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-5 animate-pulse rounded-md bg-canvas" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm text-neutral-400">No team plans found.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-black/4 last:border-0 transition-colors hover:bg-black/[0.02]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 py-3.5",
                          cell.column.id !== "name" && "text-center",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary footer */}
      {!isLoading && rows.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-3">
          <p className="text-[13px] font-medium text-neutral-500">
            Showing <span className="font-semibold text-neutral-900">{rows.length}</span> team member{rows.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-4">
            {(["OFFICE", "WFH", "LEAVE", "HOLIDAY"] as PlanLocationValue[]).map((loc) => {
              const theme = PLAN_LOCATION_THEMES[loc];
              const count = rows.reduce((sum, r) => {
                const vals = [r.mon, r.tue, r.wed, r.thu, r.fri];
                return sum + vals.filter((v) => v === loc).length;
              }, 0);
              return (
                <div key={loc} className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", theme.dot)} />
                  <span className="text-[12px] font-medium text-neutral-500">
                    {PLAN_LOCATION_MAP[loc].short_label}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums text-neutral-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
