'use client';

import { format } from 'date-fns';
import type { BulkDayState } from '@/modules/attendance/types/bulkAttendanceTypes';

interface ClockMarkerLineProps {
  time: Date;
  type: 'clock-in' | 'clock-out';
  /** Total height of the time grid in pixels */
  gridHeight: number;
  /** Start hour of the grid (e.g. 0 for midnight, 6 for 6am) */
  gridStartHour: number;
  /** End hour of the grid */
  gridEndHour: number;
}

function ClockMarkerLine({
  time,
  type,
  gridHeight,
  gridStartHour,
  gridEndHour,
}: Readonly<ClockMarkerLineProps>) {
  const totalHours = gridEndHour - gridStartHour;
  const timeHour = time.getHours() + time.getMinutes() / 60;
  const relativeHour = timeHour - gridStartHour;
  const topPercent = Math.max(0, Math.min(100, (relativeHour / totalHours) * 100));

  const isClockIn = type === 'clock-in';
  const colorClass = isClockIn ? 'bg-sky-dot' : 'bg-rose-500';
  const labelColorClass = isClockIn ? 'text-sky-text dark:text-sky-dot' : 'text-rose-600 dark:text-rose-400';
  const timeStr = format(time, 'HH:mm');

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
      style={{ top: `${topPercent}%` }}
      aria-label={`${isClockIn ? 'Clock in' : 'Clock out'} at ${timeStr}`}
    >
      {/* Line */}
      <div className={`h-px flex-1 ${colorClass} opacity-70`} />
      {/* Label */}
      <span
        className={`text-[10px] font-mono font-medium ${labelColorClass} bg-card px-1 rounded-sm border border-border ml-1 shrink-0`}
      >
        {timeStr}
      </span>
    </div>
  );
}

interface BulkAttendanceClockMarkersProps {
  /** Map of date string → day state */
  dayMap: Map<string, BulkDayState>;
  /** The 7 dates visible in the current week (YYYY-MM-DD strings) */
  visibleDates: string[];
  /** Height of the time grid container in pixels */
  gridHeight: number;
  gridStartHour: number;
  gridEndHour: number;
}

/**
 * Renders clock-in / clock-out guide lines as absolute overlays
 * on top of the calendar time grid.
 *
 * This component is positioned absolutely inside the calendar wrapper.
 * The parent must have `position: relative` and the same height as the grid.
 */
export function BulkAttendanceClockMarkers({
  dayMap,
  visibleDates,
  gridHeight,
  gridStartHour,
  gridEndHour,
}: Readonly<BulkAttendanceClockMarkersProps>) {
  return (
    <>
      {visibleDates.map((date, colIndex) => {
        const day = dayMap.get(date);
        if (!day) return null;

        // Derive clock-in/out from logs if not explicitly set
        const clockIn = day.clockIn ?? (day.logs.length > 0
          ? new Date(Math.min(...day.logs.map((l) => l.startTime.getTime())))
          : null);
        const clockOut = day.clockOut ?? (day.logs.length > 0
          ? new Date(Math.max(...day.logs.map((l) => l.endTime.getTime())))
          : null);

        if (!clockIn && !clockOut) return null;

        // Column width: 7 columns, each takes 1/7 of the grid width
        // We use CSS left/width percentages
        const colWidth = 100 / 7;
        const colLeft = colIndex * colWidth;

        return (
          <div
            key={date}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${colLeft}%`,
              width: `${colWidth}%`,
              height: gridHeight,
            }}
          >
            {clockIn && (
              <ClockMarkerLine
                time={clockIn}
                type="clock-in"
                gridHeight={gridHeight}
                gridStartHour={gridStartHour}
                gridEndHour={gridEndHour}
              />
            )}
            {clockOut && (
              <ClockMarkerLine
                time={clockOut}
                type="clock-out"
                gridHeight={gridHeight}
                gridStartHour={gridStartHour}
                gridEndHour={gridEndHour}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
