"use client";

import { addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WeekNavigatorProps {
  year: number;
  week: number;
  onChange: (year: number, week: number) => void;
}

export function WeekNavigator({ year, week, onChange }: WeekNavigatorProps) {
  const monday = startOfISOWeek(new Date(year, 0, 1 + (week - 1) * 7));
  const friday = addWeeks(monday, 0);
  friday.setDate(monday.getDate() + 4);

  const label = `Week ${week} — ${format(monday, "MMM d")}–${format(friday, "d, yyyy")}`;

  function go(delta: number) {
    const next = addWeeks(monday, delta);
    onChange(getISOWeekYear(next), getISOWeek(next));
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[200px] text-center">{label}</span>
      <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Next week">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
