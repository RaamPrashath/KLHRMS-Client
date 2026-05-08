"use client";

import { memo, useMemo } from "react";
import { isToday, parseISO } from "date-fns";
import { getWeekDays } from "@/modules/weekly-plan/date";
import type {
  PlanLocationOption,
  PlanLocationValue,
  WeeklyPlanEntry,
} from "@/types/weekly_plan";
import { DayColumn, type DayDraft } from "./DayColumn";

interface WeeklyPlanGridProps {
  year: number;
  week: number;
  entries: WeeklyPlanEntry[];
  locations: PlanLocationOption[];
  drafts?: Record<string, DayDraft>;
  readOnly?: boolean;
  isLoading?: boolean;
  actualByDate?: Record<
    string,
    {
      hasClockIn: boolean;
    }
  >;
  onDraftChange?: (date: string, draft: DayDraft) => void;
}

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

export const WeeklyPlanGrid = memo(function WeeklyPlanGrid({
  year,
  week,
  entries,
  locations,
  drafts,
  readOnly = false,
  isLoading = false,
  actualByDate,
  onDraftChange,
}: WeeklyPlanGridProps) {
  const days = useMemo(() => getWeekDays(year, week), [year, week]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {days.map((day) => (
          <div
            key={day.iso}
            className="overflow-hidden rounded-[24px] border border-border/50 bg-white shadow-sm"
          >
            <div className="h-16 animate-pulse bg-muted/30" />
            <div className="h-12 animate-pulse border-y border-border/50 bg-muted/10" />
            <div className="h-32 animate-pulse bg-white" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      {days.map(({ iso, label }) => {
        const savedEntry = entries.find((entry) => entry.date === iso);
        const displayDraft = buildDisplayDraft(savedEntry, drafts?.[iso], readOnly);
        const actualEntry = actualByDate?.[iso];

        return (
          <DayColumn
            key={iso}
            date={iso}
            dayLabel={label}
            draft={displayDraft}
            locations={locations}
            readOnly={readOnly}
            onChange={onDraftChange}
            isToday={isToday(parseISO(iso))}
            hasClockIn={actualEntry?.hasClockIn ?? false}
          />
        );
      })}
    </div>
  );
});
