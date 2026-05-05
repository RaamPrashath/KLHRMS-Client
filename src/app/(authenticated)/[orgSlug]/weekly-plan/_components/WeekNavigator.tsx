"use client";

import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WeekNavigatorProps {
  year: number;
  week: number;
  onChange: (year: number, week: number) => void;
}

function getMondayOfISOWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const week1Monday = startOfISOWeek(jan4);
  return addWeeks(week1Monday, week - 1);
}

export function WeekNavigator({ year, week, onChange }: WeekNavigatorProps) {
  const monday = getMondayOfISOWeek(year, week);
  const friday = addDays(monday, 4);

  const monthLabel = format(monday, "MMMM yyyy");
  const rangeLabel = `${format(monday, "MMM d")} – ${format(friday, "d")}`;

  function go(delta: number) {
    const nextMonday = addWeeks(monday, delta);
    onChange(getISOWeekYear(nextMonday), getISOWeek(nextMonday));
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Month label */}
      <div className="flex items-center gap-2 mr-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <span className="text-xs text-muted-foreground font-medium">
          ({rangeLabel})
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-muted"
        onClick={() => go(-1)}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-muted"
        onClick={() => go(1)}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
