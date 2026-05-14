"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getWeekRangeLabel, getWeekStart } from "@/modules/weekly-plan/date";

interface WeekNavigatorProps {
  year: number;
  week: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function WeekNavigator({
  year,
  week,
  onPrevious,
  onNext,
}: WeekNavigatorProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-[#f5f5f7] text-foreground">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground">
            {getWeekStart(year, week).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Week {week} - {getWeekRangeLabel(year, week)}
          </span>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={onPrevious}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={onNext}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
