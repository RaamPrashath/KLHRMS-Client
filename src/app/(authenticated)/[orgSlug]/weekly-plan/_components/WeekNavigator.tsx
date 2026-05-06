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
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/5 text-foreground border border-foreground/5 shadow-sm">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground leading-tight tracking-tight">
            {getWeekStart(year, week).toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 mt-0.5">
            Week {week} · {getWeekRangeLabel(year, week)}
          </span>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onPrevious}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onNext}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
