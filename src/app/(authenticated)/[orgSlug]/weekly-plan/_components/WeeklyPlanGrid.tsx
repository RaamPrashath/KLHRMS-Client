"use client";

import { addDays, format, startOfISOWeek } from "date-fns";
import { DayCell } from "./DayCell";
import type { WeeklyPlanEntry, SetDayInput } from "@/types/weekly_plan";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export interface WeeklyPlanGridProps {
  year:         number;
  week:         number;
  entries:      WeeklyPlanEntry[];
  readOnly?:    boolean;
  onDayChange?: (date: string, input: SetDayInput) => void;
}

export function WeeklyPlanGrid({
  year,
  week,
  entries,
  readOnly = false,
  onDayChange,
}: WeeklyPlanGridProps) {
  const monday = startOfISOWeek(new Date(year, 0, 1 + (week - 1) * 7));

  const days = WEEKDAYS.map((label, i) => {
    const d    = addDays(monday, i);
    const iso  = format(d, "yyyy-MM-dd");
    const entry = entries.find((e) => e.date === iso);
    return { label, iso, dayNum: format(d, "d"), entry };
  });

  return (
    <div className="grid grid-cols-5 gap-3">
      {days.map(({ label, iso, dayNum, entry }) => (
        <div key={iso} className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
            <span className="ml-1 font-normal">{dayNum}</span>
          </div>
          <div className="rounded-md border bg-card p-2.5 min-h-[80px]">
            <DayCell
              date={iso}
              entry={entry}
              readOnly={readOnly}
              onDayChange={onDayChange}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
