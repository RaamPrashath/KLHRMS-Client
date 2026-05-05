"use client";

import { addDays, addWeeks, format, isToday, parseISO, startOfISOWeek } from "date-fns";
import { DayColumn } from "./DayColumn";
import type { DayDraft } from "./DayColumn";
import type { WeeklyPlanEntry } from "@/types/weekly_plan";
import { WorkLocationType } from "@/types/weekly_plan";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export interface WeeklyPlanGridProps {
  year: number;
  week: number;
  entries: WeeklyPlanEntry[];
  drafts?: Record<string, DayDraft>;
  readOnly?: boolean;
  onDraftChange?: (date: string, draft: DayDraft) => void;
}

function getWeekDays(year: number, week: number): { iso: string; label: string }[] {
  const jan4 = new Date(year, 0, 4);
  const monday = addWeeks(startOfISOWeek(jan4), week - 1);

  return WEEKDAY_LABELS.map((day, i) => {
    const d = addDays(monday, i);
    return {
      iso: format(d, "yyyy-MM-dd"),
      label: `${day} ${format(d, "d")}`,
    };
  });
}

export function WeeklyPlanGrid({
  year,
  week,
  entries,
  drafts,
  readOnly = false,
  onDraftChange,
}: WeeklyPlanGridProps) {
  const days = getWeekDays(year, week);

  return (
    <div className="grid grid-cols-5 gap-2.5">
      {days.map(({ iso, label }) => {
        const savedEntry = entries.find((e) => e.date === iso);

        const displayDraft: DayDraft = readOnly
          ? {
              work_location: (savedEntry?.work_location as WorkLocationType) ?? "",
              project: savedEntry?.project ?? "",
            }
          : (drafts?.[iso] ?? {
              work_location: (savedEntry?.work_location as WorkLocationType) ?? "",
              project: savedEntry?.project ?? "",
            });

        const todayFlag = isToday(parseISO(iso));

        return (
          <DayColumn
            key={iso}
            date={iso}
            dayLabel={label}
            draft={displayDraft}
            readOnly={readOnly}
            onChange={onDraftChange}
            isToday={todayFlag}
          />
        );
      })}
    </div>
  );
}
