"use client";

import { memo, startTransition, useEffect, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Eraser, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSaveMonthlyPlanMutation } from "@/hooks/mutations/weekly_plan";
import { useMyMonthlyPlanQuery, usePlanLocationsQuery } from "@/hooks/queries/weekly_plan";
import { useHolidays } from "@/modules/leave/hooks/useHolidays";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";
import { dateOnlyToLocalDate, localDateKey } from "@/modules/leave/utils/dateOnly";
import {
  getCurrentMonthState,
  getMonthWeekRows,
  getMonthWeekdayDates,
  shiftMonth,
  type MonthDayItem,
} from "@/modules/weekly-plan/date";
import type {
  PlanLocationOption,
  PlanLocationValue,
  WeeklyPlanDayInput,
  WeeklyPlanEntry,
} from "@/types/weekly_plan";
import { PLAN_LOCATION_MAP, PLAN_LOCATION_THEMES } from "@/types/weekly_plan";
import { MonthNavigator } from "./MonthNavigator";

interface MonthlyPlanPanelProps {
  orgSlug: string;
  orgId: string;
  memberId: string;
  userId: string;
  onDirtyChange: (isDirty: boolean) => void;
}

const MonthDayCell = memo(function MonthDayCell({
  day,
  location,
  locations,
  isInteractive,
  isCurrentDay,
  isHolidayProtected,
  onUpdate,
}: {
  day: MonthDayItem;
  location: PlanLocationValue | "";
  locations: PlanLocationOption[];
  isInteractive: boolean;
  isCurrentDay: boolean;
  isHolidayProtected: boolean;
  onUpdate: (date: string, loc: PlanLocationValue | "") => void;
}) {
  const theme = location ? PLAN_LOCATION_THEMES[location] : null;
  const currentLabel = location ? PLAN_LOCATION_MAP[location].label : "No plan";
  const helperLabel = !isInteractive
    ? day.isWeekend
      ? "Weekend"
      : "Unavailable"
    : isHolidayProtected
      ? "Protected"
      : location
        ? ""
        : "Click to edit";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!isInteractive || isHolidayProtected}>
        <button
          type="button"
          disabled={!isInteractive || isHolidayProtected}
          aria-label={
            isInteractive
              ? `${format(day.date, "EEEE, MMMM d")}. ${currentLabel}. Open day location menu.`
              : `${format(day.date, "EEEE, MMMM d")}. ${helperLabel}.`
          }
          className={cn(
            "relative flex h-24 w-full flex-col rounded-[22px] border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
            isInteractive && !isHolidayProtected
              ? "hover:-translate-y-0.5 hover:border-foreground/20 active:scale-[0.985]"
              : "cursor-not-allowed bg-muted/10 text-muted-foreground",
            theme
              ? `${theme.bg} ${theme.border}`
              : isInteractive && !isHolidayProtected
                ? "border-border bg-background"
                : "border-border/60 bg-muted/20",
            !day.isCurrentMonth && "opacity-40 grayscale-[0.5]",
            isHolidayProtected && "opacity-80",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                {format(day.date, "EEE")}
              </span>
              <span className="text-lg font-bold leading-none text-foreground">{format(day.date, "d")}</span>
            </div>

            {isCurrentDay ? (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-background">
                Today
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              {location ? (
                <span
                  className={cn(
                    "w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight",
                    theme ? `${theme.bg} ${theme.text} ${theme.border}` : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  {PLAN_LOCATION_MAP[location].short_label}
                </span>
              ) : (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {day.isWeekend ? "Off" : "---"}
                </span>
              )}

              {helperLabel ? (
                <span className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">
                  {helperLabel}
                </span>
              ) : null}
            </div>

            {isInteractive && location ? (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-foreground/55" aria-hidden="true" />
            ) : null}
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="w-52 rounded-2xl border border-border bg-background p-2 shadow-lg"
      >
        <DropdownMenuLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
          {format(day.date, "EEEE, MMM d")}
        </DropdownMenuLabel>
        <DropdownMenuLabel className="px-2 pt-0 text-xs font-semibold text-foreground">
          {currentLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locations.map((option) => {
          const optionTheme = PLAN_LOCATION_THEMES[option.value];
          const isSelected = location === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onUpdate(day.iso, option.value)}
              className="rounded-xl px-2.5 py-2"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", optionTheme.dot)} />
              <span className="flex-1 text-xs font-semibold">{option.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                {option.short_label}
              </span>
              {isSelected ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">Current</span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onUpdate(day.iso, "")}
          className="rounded-xl px-2.5 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Eraser className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Clear day</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

function buildMonthDrafts(entries: WeeklyPlanEntry[]): Record<string, PlanLocationValue | ""> {
  return entries.reduce<Record<string, PlanLocationValue | "">>((accumulator, entry) => {
    accumulator[entry.date] = entry.work_location;
    return accumulator;
  }, {});
}

function monthDraftsEqual(
  left: Record<string, PlanLocationValue | "">,
  right: Record<string, PlanLocationValue | "">,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function MonthlyPlanPanel({ orgSlug, orgId, memberId, userId, onDirtyChange }: MonthlyPlanPanelProps) {
  const [monthState, setMonthState] = useState(getCurrentMonthState);
  const [baselineDrafts, setBaselineDrafts] = useState<Record<string, PlanLocationValue | "">>({});
  const [drafts, setDrafts] = useState<Record<string, PlanLocationValue | "">>({});
  const [isDirty, setIsDirty] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PlanLocationValue>("OFFICE");
  const { isLoading: isSessionLoading } = useSession();

  const { data: locations = [], isLoading: isLocationsLoading } = usePlanLocationsQuery(orgSlug, orgId, memberId);
  const { data: monthEntries = [], isLoading: isMonthLoading } = useMyMonthlyPlanQuery(
    orgSlug,
    orgId,
    memberId,
    monthState.year,
    monthState.month,
  );

  const { data: holidays = [] } = useHolidays(orgSlug, memberId, {
    year: monthState.year,
    month: monthState.month,
  }, { staleTime: 1000 * 60 * 10 });

  const monthStart = new Date(monthState.year, monthState.month - 1, 1);
  const monthEnd = new Date(monthState.year, monthState.month, 0);
  const { data: leaveRequestsData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED",
    fromDate: localDateKey(monthStart),
    toDate: localDateKey(monthEnd),
    page: 1,
    pageSize: 100,
  }, { staleTime: 1000 * 60 * 5 });

  const saveMutation = useSaveMonthlyPlanMutation(
    orgSlug,
    orgId,
    memberId,
    userId,
    monthState.year,
    monthState.month,
  );

  const monthRows = useMemo(
    () => getMonthWeekRows(monthState.year, monthState.month),
    [monthState.month, monthState.year],
  );

  const weekdayDates = useMemo(
    () => getMonthWeekdayDates(monthState.year, monthState.month),
    [monthState.month, monthState.year],
  );

  const holidayDates = useMemo(
    () =>
      new Set(
        holidays
          .filter((h) => h.isHoliday)
          .map((h) => h.holidayDate),
      ),
    [holidays],
  );

  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    if (leaveRequestsData?.items) {
      for (const leave of leaveRequestsData.items) {
        const start = dateOnlyToLocalDate(leave.startDate);
        const end = dateOnlyToLocalDate(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(localDateKey(d));
        }
      }
    }
    return set;
  }, [leaveRequestsData]);

  useEffect(() => {
    const nextBaseline = buildMonthDrafts(monthEntries);
    const autoFilledDrafts = { ...nextBaseline };

    weekdayDates.forEach((date) => {
      if (holidayDates.has(date)) {
        autoFilledDrafts[date] = "HOLIDAY";
      } else if (leaveDates.has(date) && !autoFilledDrafts[date]) {
        autoFilledDrafts[date] = "LEAVE";
      }
    });

    startTransition(() => {
      setBaselineDrafts(autoFilledDrafts);
      setDrafts(autoFilledDrafts);
      setIsDirty(false);
    });
  }, [monthEntries, weekdayDates, holidayDates, leaveDates]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    weekdayDates.forEach((date) => {
      const location = drafts[date];
      if (!location) return;
      counts[location] = (counts[location] ?? 0) + 1;
    });

    return {
      counts,
      unset: weekdayDates.filter((date) => !drafts[date]).length,
    };
  }, [drafts, weekdayDates]);

  function updateDraft(date: string, nextLocation: PlanLocationValue | "") {
    if (holidayDates.has(date) && drafts[date] === "HOLIDAY") return;
    if (leaveDates.has(date) && drafts[date] === "LEAVE") return;

    setDrafts((current) => {
      const nextDrafts = { ...current, [date]: nextLocation };
      setIsDirty(!monthDraftsEqual(nextDrafts, baselineDrafts));
      return nextDrafts;
    });
  }

  function maybeChangeMonth(delta: number) {
    if (
      isDirty &&
      !globalThis.confirm("You have unsaved monthly changes. Move to another month anyway?")
    ) {
      return;
    }
    setMonthState((current) => shiftMonth(current.year, current.month, delta));
  }

  function handleApplyEverywhere() {
    const protectedDates = new Set([...holidayDates, ...leaveDates]);
    const nonProtectedWeekdays = weekdayDates.filter((date) => !protectedDates.has(date));
    const alreadySetCount = nonProtectedWeekdays.filter((date) => drafts[date]).length;

    if (
      alreadySetCount > 0 &&
      !globalThis.confirm(
        `Apply ${PLAN_LOCATION_MAP[selectedLocation].label} to all ${nonProtectedWeekdays.length} non-holiday weekdays? ` +
          `${alreadySetCount} existing day selections will be overwritten.`,
      )
    ) {
      return;
    }

    const nextDrafts = { ...drafts };
    nonProtectedWeekdays.forEach((date) => {
      nextDrafts[date] = selectedLocation;
    });

    setDrafts(nextDrafts);
    setIsDirty(!monthDraftsEqual(nextDrafts, baselineDrafts));
  }

  function handleClearAll() {
    if (!isDirty) return;
    setDrafts(baselineDrafts);
    setIsDirty(false);
  }

  async function handleSave() {
    const payload: WeeklyPlanDayInput[] = weekdayDates.map((date) => ({
      date,
      work_location: (drafts[date] || null) as PlanLocationValue | null,
      project: null,
    }));

    try {
      const entries = await saveMutation.mutateAsync(payload);
      const nextBaseline = buildMonthDrafts(entries);
      setBaselineDrafts(nextBaseline);
      setDrafts(nextBaseline);
      setIsDirty(false);
      toast.success("Monthly plan saved.");
    } catch {
      // Mutation handles the error toast.
    }
  }

  const resolvedLocations = locations as PlanLocationOption[];
  const plannedDaysCount = weekdayDates.length - summary.unset;
  const completionRatio = weekdayDates.length ? plannedDaysCount / weekdayDates.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
          <MonthNavigator
            year={monthState.year}
            month={monthState.month}
            onPrevious={() => maybeChangeMonth(-1)}
            onNext={() => maybeChangeMonth(1)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedLocation} onValueChange={(value) => setSelectedLocation(value as PlanLocationValue)}>
              <SelectTrigger className="h-10 min-w-[220px] rounded-xl border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Choose a location" />
              </SelectTrigger>
              <SelectContent>
                {resolvedLocations.map((location) => (
                  <SelectItem key={location.value} value={location.value} className="text-xs font-semibold">
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="btn-clockout-border h-9 rounded-xl px-5 text-xs font-semibold capitalize tracking-wider"
              onClick={handleApplyEverywhere}
              disabled={isMonthLoading || isLocationsLoading || saveMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4 shrink-0" />
              Apply to all weekdays
            </Button>

            <Button
              type="button"
              variant="outline"
              className="btn-clockout-border h-9 rounded-xl px-5 text-xs font-semibold capitalize tracking-wider"
              onClick={handleClearAll}
              disabled={!isDirty || isMonthLoading || isLocationsLoading || saveMutation.isPending}
            >
              <Eraser className="mr-2 h-4 w-4 shrink-0" />
              Reset draft
            </Button>

            <Button
              type="button"
              className="btn-primary-grad h-9 rounded-lg px-5 text-xs font-semibold capitalize tracking-wider"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending || isMonthLoading}
            >
              <Save className="mr-2 h-4 w-4 shrink-0" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
      </section>

      <section className="bg-white rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {resolvedLocations.map((location) => {
              const theme = PLAN_LOCATION_THEMES[location.value];
              const count = summary.counts[location.value] ?? 0;
              return (
                <div key={location.value} className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <span className={cn("h-2 w-2 rounded-full", theme.dot)} />
                  <span>{location.short_label}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {Math.round(completionRatio * 100)}%
          </span>
        </div>

        <div className="mb-6 grid grid-cols-7 gap-3 px-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <span
              key={label}
              className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {isSessionLoading || isMonthLoading || isLocationsLoading
            ? Array.from({ length: 5 }, (_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-3">
                  {Array.from({ length: 7 }, (_, columnIndex) => (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      className="h-24 animate-pulse rounded-[22px] border border-border/50 bg-muted/10"
                    />
                  ))}
                </div>
              ))
            : monthRows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-3">
                  {row.map((day) => {
                    const isHolidayProtected =
                      (holidayDates.has(day.iso) && drafts[day.iso] === "HOLIDAY") ||
                      (leaveDates.has(day.iso) && drafts[day.iso] === "LEAVE");

                    return (
                      <MonthDayCell
                        key={day.iso}
                        day={day}
                        location={drafts[day.iso] || ""}
                        locations={resolvedLocations}
                        isInteractive={day.isCurrentMonth && !day.isWeekend}
                        isCurrentDay={isToday(parseISO(day.iso))}
                        isHolidayProtected={isHolidayProtected}
                        onUpdate={updateDraft}
                      />
                    );
                  })}
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}
