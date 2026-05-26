'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SaveState } from '@/modules/attendance/types/bulkAttendanceTypes';

interface BulkAttendanceToolbarProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  saveState: SaveState;
  saveError: string | null;
}

export function BulkAttendanceToolbar({
  weekStart,
  onPrev,
  onNext,
  onToday,
  saveState,
  saveError,
}: Readonly<BulkAttendanceToolbarProps>) {
  const visibleMonthLabel = format(weekStart, 'MMMM');
  const isCurrentWeek = (() => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    return weekStart.getTime() === currentWeekStart.getTime();
  })();

  return (
    <div className="flex items-center gap-3">
      {/* iOS-style segmented control navigation */}
      <div className="inline-flex items-center gap-0 bg-secondary/40 border border-border p-0.5 rounded-lg">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentWeek}
          aria-label={`Jump to current week from ${visibleMonthLabel}`}
          className={[
            'h-8 px-4 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5',
            isCurrentWeek
              ? 'bg-card text-primary shadow-sm cursor-default border border-border/50'
              : 'text-muted-foreground hover:text-foreground',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {visibleMonthLabel}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>

      {/* Save state */}
      {saveState === 'saving' && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border border-border/50 px-2 py-1 rounded-md">
          <Loader2 className="size-3 animate-spin" />
          Saving
        </span>
      )}
      {saveState === 'saved' && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
          <CheckCircle2 className="size-3" />
          Saved
        </span>
      )}
      {saveState === 'error' && (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1 rounded-md"
          title={saveError ?? undefined}
        >
          <AlertCircle className="size-3" />
          Save failed
        </span>
      )}
    </div>
  );
}
