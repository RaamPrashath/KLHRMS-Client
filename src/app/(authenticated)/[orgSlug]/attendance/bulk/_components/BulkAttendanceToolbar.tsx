'use client';

import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: title */}
      <div className="flex items-center gap-3">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">
          {formatWeekRange(weekStart)}
        </h2>

        {/* Save state indicator */}
        {saveState === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            <Loader2 className="size-3 animate-spin" />
            Saving…
          </span>
        )}
        {saveState === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-success-text">
            <CheckCircle2 className="size-3" />
            Saved
          </span>
        )}
        {saveState === 'error' && (
          <span className="flex items-center gap-1 text-xs text-destructive-text" title={saveError ?? undefined}>
            <AlertCircle className="size-3" />
            Save failed
          </span>
        )}
      </div>

      {/* Right: navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="size-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 border border-neutral-200 transition-colors duration-100"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="h-8 px-3 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors duration-100 flex items-center gap-1.5"
        >
          <RotateCcw className="size-3" strokeWidth={2} />
          Today
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="size-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 border border-neutral-200 transition-colors duration-100"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
