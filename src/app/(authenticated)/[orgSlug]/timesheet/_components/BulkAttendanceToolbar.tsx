'use client';

import { format, addDays } from 'date-fns';
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

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = format(weekStart, 'MMM');
  const endMonth = format(weekEnd, 'MMM');
  const year = format(weekEnd, 'yyyy');

  if (startMonth === endMonth) {
    return `${format(weekStart, 'd')}–${format(weekEnd, 'd')} ${startMonth} ${year}`;
  }
  return `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM')} ${year}`;
}

export function BulkAttendanceToolbar({
  weekStart,
  onPrev,
  onNext,
  onToday,
  saveState,
  saveError,
}: Readonly<BulkAttendanceToolbarProps>) {
  const isCurrentWeek = (() => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1);
    currentWeekStart.setHours(0, 0, 0, 0);
    return weekStart.getTime() === currentWeekStart.getTime();
  })();

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: week label + save state */}
      <div className="flex items-center gap-3">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight tabular-nums">
          {formatWeekRange(weekStart)}
        </h2>

        {saveState === 'saving' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 bg-canvas px-2 py-1 rounded-md">
            <Loader2 className="size-3 animate-spin" />
            Saving
          </span>
        )}
        {saveState === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-text bg-success-bg px-2 py-1 rounded-md">
            <CheckCircle2 className="size-3" />
            Saved
          </span>
        )}
        {saveState === 'error' && (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive-text bg-destructive-bg px-2 py-1 rounded-md"
            title={saveError ?? undefined}
          >
            <AlertCircle className="size-3" />
            Save failed
          </span>
        )}
      </div>

      {/* Right: iOS-style segmented control navigation */}
      <div className="inline-flex items-center gap-0 bg-neutral-50 rounded-lg p-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="size-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentWeek}
          className={[
            'h-8 px-4 text-xs font-medium rounded-md transition-all duration-150 flex items-center gap-1.5',
            isCurrentWeek
              ? 'bg-white text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)] cursor-default'
              : 'text-neutral-700 hover:text-neutral-900',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Today
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="size-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
