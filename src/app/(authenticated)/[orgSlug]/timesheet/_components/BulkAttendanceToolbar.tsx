'use client';

'use client';

import { addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SaveState } from '@/modules/attendance/types/bulkAttendanceTypes';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface BulkAttendanceToolbarProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  saveState: SaveState;
  saveError: string | null;
  showTimesheetEntryToggle?: boolean;
  onTimesheetToggle?: () => void;
  totalHoursLogged?: number;
  totalHoursTarget?: number;
}

export function BulkAttendanceToolbar({
  weekStart,
  onPrev,
  onNext,
  onToday,
  saveState,
  saveError,
  showTimesheetEntryToggle = false,
  onTimesheetToggle,
  totalHoursLogged = 0,
  totalHoursTarget = 40,
}: Readonly<BulkAttendanceToolbarProps>) {
  const isCurrentWeek = (() => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    return weekStart.getTime() === currentWeekStart.getTime();
  })();

  const startDateStr = format(weekStart, 'dd MMM');
  const endDateStr = format(addDays(weekStart, 6), 'dd MMM, yyyy');
  const dateRangeLabel = `${startDateStr} - ${endDateStr}`;

  return (
    <div className="flex flex-wrap items-center justify-between w-full border-b border-border bg-card/35 px-7 py-3 gap-4 flex-row shrink-0">
      {/* Left section: Date Navigation */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center bg-muted/30 border border-border rounded-lg overflow-hidden h-9">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous week"
            className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-3 text-xs font-semibold tracking-tight text-foreground border-x border-border/80 h-full flex items-center bg-card/25 min-w-[155px] justify-center select-none font-mono">
            {dateRangeLabel}
          </span>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next week"
            className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentWeek}
          className={cn(
            "h-9 px-4 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center",
            isCurrentWeek
              ? "bg-muted/20 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
              : "bg-card border-border hover:bg-muted/50 text-foreground hover:text-foreground"
          )}
        >
          Today
        </button>
      </div>

      {/* Right section: Progress only */}
      <div className="flex items-center gap-3">
        {/* Weekly Hours Progress */}
        <div className="flex items-center gap-3 h-9">
          <div className="flex flex-col items-end justify-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Week</span>
            <span className="text-xs font-semibold text-foreground mt-0.5 leading-none font-mono">
              {totalHoursLogged.toFixed(1).replace('.0', '')}h of {totalHoursTarget}h
            </span>
          </div>
          <div className="w-24">
            <Progress
              value={Math.min(100, (totalHoursLogged / totalHoursTarget) * 100)}
              className="h-1.5 border border-border/20 bg-muted/40 [&_[data-slot=progress-indicator]]:bg-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

