"use client";

import { Fragment, memo, useMemo, type ElementType } from "react";
import { isToday, parseISO } from "date-fns";
import { Building2, House, PartyPopper, Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWeekDays } from "@/modules/weekly-plan/date";
import type {
  PlanLocationOption,
  PlanLocationValue,
  WeeklyPlanEntry,
} from "@/types/weekly_plan";
import { PLAN_LOCATION_THEMES } from "@/types/weekly_plan";

import type { DayDraft } from "./DayColumn";

interface WeeklyPlanGridProps {
  year: number;
  week: number;
  entries: WeeklyPlanEntry[];
  locations: PlanLocationOption[];
  drafts?: Record<string, DayDraft>;
  readOnly?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  actualByDate?: Record<
    string,
    {
      hasClockIn: boolean;
    }
  >;
  holidayDates?: Set<string>;
  onDraftChange?: (date: string, draft: DayDraft) => void;
  onSave?: () => void;
}

const LOCATION_ORDER: PlanLocationValue[] = ["OFFICE", "WFH", "LEAVE", "HOLIDAY"];

const LOCATION_ICONS = {
  OFFICE: Building2,
  WFH: House,
  LEAVE: Plane,
  HOLIDAY: PartyPopper,
} satisfies Record<PlanLocationValue, ElementType>;

function buildDisplayDraft(
  entry: WeeklyPlanEntry | undefined,
  draft: DayDraft | undefined,
  readOnly: boolean,
): DayDraft {
  if (readOnly) {
    return {
      work_location: (entry?.work_location as PlanLocationValue | undefined) ?? "",
      project: entry?.project ?? "",
    };
  }

  if (draft) return draft;
  return {
    work_location: (entry?.work_location as PlanLocationValue | undefined) ?? "",
    project: entry?.project ?? "",
  };
}

function selectedCellRadius(
  isSelected: boolean,
  hasPrevious: boolean,
  hasNext: boolean,
) {
  if (!isSelected) return "rounded-lg";
  if (hasPrevious && hasNext) return "rounded-[4px]";
  if (hasPrevious) return "rounded-l-[4px] rounded-r-lg";
  if (hasNext) return "rounded-l-lg rounded-r-[4px]";
  return "rounded-lg";
}

export const WeeklyPlanGrid = memo(function WeeklyPlanGrid({
  year,
  week,
  entries,
  locations,
  drafts,
  readOnly = false,
  isLoading = false,
  isDirty = false,
  isSaving = false,
  holidayDates = new Set(),
  onDraftChange,
  onSave,
}: WeeklyPlanGridProps) {
  const days = useMemo(() => getWeekDays(year, week), [year, week]);

  const dayDrafts = useMemo(
    () =>
      days.map(({ iso }) => {
        const savedEntry = entries.find((entry) => entry.date === iso);
        return {
          date: iso,
          draft: buildDisplayDraft(savedEntry, drafts?.[iso], readOnly),
        };
      }),
    [days, drafts, entries, readOnly],
  );

  const counts = useMemo(() => {
    const map = new Map<PlanLocationValue, number>();
    for (const location of LOCATION_ORDER) {
      map.set(location, 0);
    }

    for (const item of dayDrafts) {
      const value = item.draft.work_location;
      if (value) {
        map.set(value, (map.get(value as PlanLocationValue) ?? 0) + 1);
      }
    }

    return map;
  }, [dayDrafts]);

  function handleSelect(date: string, nextLocation: PlanLocationValue) {
    // Prevent changing holiday cells
    if (holidayDates.has(date)) {
      return;
    }
    
    const current = dayDrafts.find((item) => item.date === date)?.draft ?? {
      work_location: "",
      project: "",
    };

    onDraftChange?.(date, {
      ...current,
      work_location: nextLocation,
    });
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-border bg-white">
        <div className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-[96px_repeat(5,minmax(0,1fr))] gap-3">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-xl bg-muted/40"
              />
            ))}
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-44 animate-pulse rounded-full bg-muted/40" />
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-muted/40" />
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-white">
      <div className="overflow-x-auto px-5 py-5 sm:px-6">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[96px_repeat(5,minmax(0,1fr))] gap-x-1.5 gap-y-2">
            <div />
            {days.map(({ iso, label }) => {
              const [dayName, dayNumber] = label.split(" ");
              const today = isToday(parseISO(iso));

              return (
                <div
                  key={iso}
                  className="px-1 pb-2 text-center"
                >
                  <p className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground">
                    {today ? `${dayName} - Today` : dayName}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[18px] font-semibold leading-none",
                      today ? "text-[#00874a]" : "text-foreground",
                    )}
                  >
                    {dayNumber}
                  </p>
                </div>
              );
            })}

            {LOCATION_ORDER.map((rowLocation) => {
              const rowMeta =
                locations.find((item) => item.value === rowLocation) ?? null;
              const rowTheme = PLAN_LOCATION_THEMES[rowLocation];
              const Icon = LOCATION_ICONS[rowLocation];

              return (
                <Fragment key={rowLocation}>
                  <div
                    className="flex h-10 items-center gap-2 pr-2 text-foreground"
                  >
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <span className="text-[14px] font-semibold leading-none tracking-[-0.01em]">
                      {rowMeta?.label ?? rowLocation}
                    </span>
                  </div>

                  {dayDrafts.map((item, index) => {
                    const isSelected = item.draft.work_location === rowLocation;
                    const previousMatches =
                      index > 0 && dayDrafts[index - 1]?.draft.work_location === rowLocation;
                    const nextMatches =
                      index < dayDrafts.length - 1 &&
                      dayDrafts[index + 1]?.draft.work_location === rowLocation;
                    const isCurrentDay = isToday(parseISO(item.date));
                    const isHoliday = holidayDates.has(item.date);
                    const isProtected = isHoliday && item.draft.work_location === "HOLIDAY";

                    const content = (
                      <div
                        className={cn(
                          "flex h-10 w-full items-center justify-center border text-center transition-all duration-200",
                          isSelected
                            ? `${rowTheme.bg} ${rowTheme.border} ${rowTheme.text} ${selectedCellRadius(true, previousMatches, nextMatches)} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]`
                            : cn(
                                "rounded-lg border-border bg-[#f8f8fa] text-transparent",
                                isCurrentDay
                                  ? "border-[#00874a]/45 bg-[#f4fbf7]"
                                  : "hover:border-[#d8d8de] hover:bg-[#f2f2f5]",
                              ),
                          isProtected && "opacity-80 cursor-not-allowed",
                        )}
                      >
                        {isSelected ? (
                          <span className="px-2 text-[14px] font-semibold leading-none">
                            {rowLocation === "WFH"
                              ? "WFH"
                              : rowMeta?.label ?? rowLocation}
                          </span>
                        ) : null}
                      </div>
                    );

                    if (readOnly) {
                      return (
                        <div key={`${rowLocation}-${item.date}`}>
                          {content}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`${rowLocation}-${item.date}`}
                        type="button"
                        onClick={() => handleSelect(item.date, rowLocation)}
                        disabled={isProtected}
                        className={cn(
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00874a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          isProtected && "cursor-not-allowed"
                        )}
                        aria-pressed={isSelected}
                        aria-label={`${rowMeta?.label ?? rowLocation} on ${item.date}`}
                      >
                        {content}
                      </button>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {LOCATION_ORDER.filter((location) => (counts.get(location) ?? 0) > 0).map(
                  (location) => {
                    const total = counts.get(location) ?? 0;
                    const meta =
                      locations.find((item) => item.value === location) ?? null;
                    const theme = PLAN_LOCATION_THEMES[location];

                    return (
                      <div
                        key={location}
                        className="flex items-center gap-2 text-[12px] font-semibold text-foreground/75"
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", theme.dot)} />
                        <span>
                          {total} {location === "WFH" ? "WFH" : meta?.label ?? location}
                        </span>
                      </div>
                    );
                  },
                )}

                {LOCATION_ORDER.every((location) => (counts.get(location) ?? 0) === 0) ? (
                  <p className="text-[12px] font-medium text-muted-foreground">
                    No plan selected yet.
                  </p>
                ) : null}
              </div>

              {!readOnly ? (
                <Button
                  type="button"
                  onClick={onSave}
                  disabled={!isDirty || isSaving}
                  className="h-11 rounded-full border border-[#0b7a44] bg-[linear-gradient(180deg,#1ac56f_0%,#00874a_100%)] px-6 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(0,135,74,0.22),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_14px_28px_rgba(0,135,74,0.26),inset_0_1px_0_rgba(255,255,255,0.4)] disabled:border-border disabled:bg-[#e8e8eb] disabled:text-muted-foreground disabled:shadow-none"
                >
                  {isSaving ? "Saving..." : "Save plan"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
