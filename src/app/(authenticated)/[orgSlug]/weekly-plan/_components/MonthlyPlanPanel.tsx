"use client";

import { memo, startTransition, useEffect, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Eraser, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  selectedLocation,
  isInteractive,
  isCurrentDay,
  isHolidayProtected,
  onUpdate,
}: {
  day: MonthDayItem;
  location: PlanLocationValue | "";
  selectedLocation: PlanLocationValue;
  isInteractive: boolean;
  isCurrentDay: boolean;
  isHolidayProtected: boolean;
  onUpdate: (date: string, loc: PlanLocationValue | "") => void;
}) {
  const theme = location ? PLAN_LOCATION_THEMES[location] : null;

  return (
    <button
      type="button"
      disabled={!isInteractive || isHolidayProtected}
      onClick={() => onUpdate(day.iso, selectedLocation)}
      className={cn(
        "relative flex h-24 flex-col rounded-[22px] border p-3 text-left transition-all duration-200",
        isInteractive && !isHolidayProtected
          ? "hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)] active:scale-[0.97]"
          : "cursor-not-allowed bg-muted/10 text-muted-foreground",
        theme
          ? `${theme.bg} ${theme.border}`
          : isInteractive && !isHolidayProtected
            ? "border-border bg-white"
            : "border-border/60 bg-muted/20",
        !day.isCurrentMonth && "opacity-40 grayscale-[0.5]",
        isHolidayProtected && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60 leading-none mb-1">
            {format(day.date, "EEE")}
          </span>
          <span className="text-lg font-bold text-foreground leading-none">
            {format(day.date, "d")}
          </span>
        </div>

        {isCurrentDay ? (
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-background">
            Today
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        {location ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-tight shadow-sm",
              theme ? `${theme.bg} ${theme.text} border ${theme.border}` : "bg-muted/50 text-muted-foreground",
            )}
          >
            {PLAN_LOCATION_MAP[location].short_label}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            {day.isWeekend ? "Off" : "---"}
          </span>
        )}

        {isInteractive && location && !isHolidayProtected ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onUpdate(day.iso, "");
            }}
            className="inline-flex items-center rounded-full border border-border/70 bg-white/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white hover:text-destructive transition-colors"
          >
            <Eraser className="h-2.5 w-2.5 mr-1" />
            Clear
          </span>
        ) : null}
      </div>
    </button>
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

export function MonthlyPlanPanel({
  orgSlug,
  orgId,
  memberId,
  userId,
  onDirtyChange,
}: MonthlyPlanPanelProps) {
  const [monthState, setMonthState] = useState(getCurrentMonthState);
  const [baselineDrafts, setBaselineDrafts] = useState<Record<string, PlanLocationValue | "">>(
    {},
  );
  const [drafts, setDrafts] = useState<Record<string, PlanLocationValue | "">>({});
  const [isDirty, setIsDirty] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PlanLocationValue>("OFFICE");

  const { data: locations = [], isLoading: isLocationsLoading } = usePlanLocationsQuery(
    orgSlug,
    orgId,
    memberId,
  );
  const {
    data: monthEntries = [],
    isLoading: isMonthLoading,
  } = useMyMonthlyPlanQuery(orgSlug, orgId, memberId, monthState.year, monthState.month);
  
  // Fetch holidays for the current month
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, {
    year: monthState.year,
    month: monthState.month,
  });

  // Fetch approved leaves for the current month
  const monthStart = new Date(monthState.year, monthState.month - 1, 1);
  const monthEnd = new Date(monthState.year, monthState.month, 0);
  const { data: leaveRequestsData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED",
    fromDate: monthStart.toISOString().split("T")[0],
    toDate: monthEnd.toISOString().split("T")[0],
    page: 1,
    pageSize: 100,
  });
  
  const saveMutation = useSaveMonthlyPlanMutation(
    orgSlug,
    orgId,
    memberId,
    userId,
    monthState.year,
    monthState.month,
  );

  useEffect(() => {
    const nextBaseline = buildMonthDrafts(monthEntries);
    
    // Auto-fill holidays and leaves
    const autoFilledDrafts = { ...nextBaseline };
    
    // Create a set of holiday dates
    const holidayDates = new Set(
      holidays
        .filter((h) => h.isHoliday)
        .map((h) => h.holidayDate)
    );
    
    // Create a map of leave dates
    const leaveDates = new Set<string>();
    if (leaveRequestsData?.items) {
      leaveRequestsData.items.forEach((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          leaveDates.add(dateStr);
        }
      });
    }
    
    // Get all weekday dates for the month
    const weekdayDates = getMonthWeekdayDates(monthState.year, monthState.month);
    
    // Auto-fill dates - ALWAYS override with holidays, then leaves if no holiday
    weekdayDates.forEach((date) => {
      // ALWAYS set holidays, regardless of existing value
      if (holidayDates.has(date)) {
        autoFilledDrafts[date] = "HOLIDAY";
      } 
      // Only set leaves if there's no existing entry AND it's not a holiday
      else if (leaveDates.has(date) && !autoFilledDrafts[date]) {
        autoFilledDrafts[date] = "LEAVE";
      }
    });
    
    startTransition(() => {
      setBaselineDrafts(autoFilledDrafts);
      setDrafts(autoFilledDrafts);
      setIsDirty(false);
    });
  }, [monthEntries, monthState.month, monthState.year, holidays, leaveRequestsData]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const monthRows = useMemo(
    () => getMonthWeekRows(monthState.year, monthState.month),
    [monthState.month, monthState.year],
  );

  const weekdayDates = useMemo(
    () => getMonthWeekdayDates(monthState.year, monthState.month),
    [monthState.month, monthState.year],
  );

  // Create a set of holiday dates for protection
  const holidayDates = useMemo(
    () =>
      new Set(
        holidays
          .filter((h) => h.isHoliday)
          .map((h) => h.holidayDate)
      ),
    [holidays]
  );

  // Create a set of leave dates for protection
  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    if (leaveRequestsData?.items) {
      for (const leave of leaveRequestsData.items) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(d.toISOString().split("T")[0]);
        }
      }
    }
    return set;
  }, [leaveRequestsData]);

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
    // Prevent changing holiday or leave cells
    if (holidayDates.has(date) && drafts[date] === "HOLIDAY") {
      return;
    }
    if (leaveDates.has(date) && drafts[date] === "LEAVE") {
      return;
    }
    
    setDrafts((current) => {
      const nextDrafts = { ...current, [date]: nextLocation };
      const nextDirty = !monthDraftsEqual(nextDrafts, baselineDrafts);
      setIsDirty(nextDirty);
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
    // Count non-holiday, non-leave weekdays
    const protectedDates = new Set([...holidayDates, ...leaveDates]);
    const nonProtectedWeekdays = weekdayDates.filter(date => !protectedDates.has(date));
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
      // Only update if it's not a protected holiday or leave
      if (!protectedDates.has(date)) {
        nextDrafts[date] = selectedLocation;
      }
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

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4">
            <MonthNavigator
              year={monthState.year}
              month={monthState.month}
              onPrevious={() => maybeChangeMonth(-1)}
              onNext={() => maybeChangeMonth(1)}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedLocation}
                onValueChange={(value) => setSelectedLocation(value as PlanLocationValue)}
              >
                <SelectTrigger className="h-10 min-w-[200px] rounded-lg text-sm">
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  {resolvedLocations.map((location) => (
                    <SelectItem key={location.value} value={location.value} className="text-xs font-bold">
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg px-4 text-sm font-medium"
                onClick={handleApplyEverywhere}
                disabled={isMonthLoading || isLocationsLoading || saveMutation.isPending}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Apply to all weekdays
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg px-4 text-sm font-medium"
                onClick={handleClearAll}
                disabled={!isDirty || isMonthLoading || isLocationsLoading || saveMutation.isPending}
              >
                <Eraser className="mr-2 h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="h-10 rounded-lg px-5 text-sm font-medium"
            style={{ backgroundColor: '#00874a' }}
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending || isMonthLoading}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
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
          {isMonthLoading || isLocationsLoading ? (
            Array.from({ length: 5 }, (_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-7 gap-3">
                {Array.from({ length: 7 }, (_, columnIndex) => (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    className="h-24 animate-pulse rounded-[22px] border border-border/50 bg-muted/10"
                  />
                ))}
              </div>
            ))
          ) : (
            monthRows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-7 gap-3">
                {row.map((day) => {
                  const isHolidayProtected = (holidayDates.has(day.iso) && drafts[day.iso] === "HOLIDAY") || (leaveDates.has(day.iso) && drafts[day.iso] === "LEAVE");
                  
                  return (
                    <MonthDayCell
                      key={day.iso}
                      day={day}
                      location={drafts[day.iso] || ""}
                      selectedLocation={selectedLocation}
                      isInteractive={day.isCurrentMonth && !day.isWeekend}
                      isCurrentDay={isToday(parseISO(day.iso))}
                      isHolidayProtected={isHolidayProtected}
                      onUpdate={updateDraft}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Month summary</h2>
            <p className="text-[11px] text-muted-foreground/60 font-medium">
              Live totals update as you tap weekdays in the strip above.
            </p>
          </div>
          <span className="rounded-full bg-muted/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {summary.unset} days remaining
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resolvedLocations.map((location) => {
            const theme = PLAN_LOCATION_THEMES[location.value];
            return (
              <div
                key={location.value}
                className={cn(
                  "rounded-[24px] border px-5 py-5 transition-all duration-300",
                  theme.bg,
                  theme.border,
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-3 w-3 rounded-full shadow-sm", theme.dot)} />
                    <div>
                      <p className={cn("text-[13px] font-bold tracking-tight uppercase", theme.text)}>{location.label}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{location.short_label}</p>
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-foreground tabular-nums">
                    {summary.counts[location.value] ?? 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
