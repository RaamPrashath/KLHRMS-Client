"use client";

import { addDays, addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WeekNavigatorProps {
  year: number;
  week: number;
  onChange: (year: number, week: number) => void;
}

/**
 * Derive the Monday of a given ISO year+week without using new Date() at
 * render time (which causes hydration mismatches).
 *
 * Strategy: Jan 4 is always in ISO week 1 of its year. Walk forward
 * (week - 1) * 7 days from the Monday of that week.
 */
function getMondayOfISOWeek(year: number, week: number): Date {
  // Jan 4 is guaranteed to be in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const week1Monday = startOfISOWeek(jan4);
  return addWeeks(week1Monday, week - 1);
}

export function WeekNavigator({ year, week, onChange }: WeekNavigatorProps) {
  const monday = getMondayOfISOWeek(year, week);
  const friday = addDays(monday, 4);

  const label = `${format(monday, "MMM d")} – ${format(friday, "MMM d, yyyy")}`;

  function go(delta: number) {
    const nextMonday = addWeeks(monday, delta);
    onChange(getISOWeekYear(nextMonday), getISOWeek(nextMonday));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => go(-1)}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[180px] text-center text-foreground">
        {label}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => go(1)}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
