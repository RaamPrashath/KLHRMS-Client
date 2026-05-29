'use client';

import { useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { format, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';

import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { BulkAttendanceEvent } from './BulkAttendanceEvent';

import type {
  BulkDayState,
  CalendarWorkLogEvent,
  LocalWorkLog,
} from '@/modules/attendance/types/bulkAttendanceTypes';
import type { HolidayRecord, LeaveRequestRecord } from '@/modules/leave/types/leaveTypes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── react-big-calendar setup ─────────────────────────────────────────────────

moment.updateLocale('en', {
  week: {
    dow: 0, // Sunday = first day of week
    doy: 6,
  },
});

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop<CalendarWorkLogEvent>(Calendar);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateToYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function dateWithTime(dateStr: string, timeSource: Date): Date | null {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day || Number.isNaN(timeSource.getTime())) return null;
  return new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
}

function normalizeLogEventRange(
  dateStr: string,
  log: LocalWorkLog,
): { start: Date; end: Date } | null {
  const start = dateWithTime(dateStr, log.startTime);
  const rawEnd = dateWithTime(dateStr, log.endTime);
  if (!start || !rawEnd) return null;

  const durationMs = rawEnd.getTime() - start.getTime();
  const end = durationMs > 0 ? rawEnd : new Date(start.getTime() + 15 * 60_000);
  return { start, end };
}

function logsToEvents(dayMap: Map<string, BulkDayState>): CalendarWorkLogEvent[] {
  const events: CalendarWorkLogEvent[] = [];
  for (const day of dayMap.values()) {
    for (const log of day.logs) {
      const range = normalizeLogEventRange(day.date, log);
      if (!range) continue;

      events.push({
        id: log.id,
        title: log.title ?? log.notes ?? '',
        start: range.start,
        end: range.end,
        resource: {
          type: 'work-log',
          date: day.date,
          projectId: log.projectId,
          projectTaskId: log.projectTaskId,
          title: log.title,
          notes: log.notes,
          isOptimistic: log.isOptimistic,
        },
      });
    }
  }
  return events;
}

function formatMins(totalMins: number): string {
  if (totalMins <= 0) return '0h';
  if (totalMins >= 60) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${totalMins}m`;
}

// ─── Custom day header ────────────────────────────────────────────────────────

interface DayHeaderProps {
  date: Date;
  dayMap: Map<string, BulkDayState>;
  holidayMap: Map<string, HolidayRecord>;
  leaveMap: Map<string, LeaveRequestRecord>;
  onAddLog: (date: string) => void;
}

function DayColumnHeader({ date, dayMap, holidayMap, leaveMap, onAddLog }: Readonly<DayHeaderProps>) {
  const dateStr = dateToYMD(date);
  const day = dayMap.get(dateStr);
  const isToday = isSameDay(date, new Date());
  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const holiday = holidayMap.get(dateStr);
  const leave = leaveMap.get(dateStr);
  const isOff = isWeekend || !!holiday || !!leave;

  const totalMins = day?.logs.reduce((sum, l) => {
    const diff = l.endTime.getTime() - l.startTime.getTime();
    return sum + Math.round(diff / 60_000);
  }, 0) ?? 0;

  const hasLogs = totalMins > 0;

  // Determine text color for day name and date number
  let labelColor: string;
  let dateColor: string;
  if (isToday) {
    labelColor = 'text-primary';
    dateColor = 'text-primary';
  } else if (isOff) {
    labelColor = 'text-red-500';
    dateColor = 'text-red-500';
  } else {
    labelColor = 'text-muted-foreground';
    dateColor = 'text-foreground';
  }

  const headerContent = (
    <div className="relative flex h-full flex-col">
      {/* Date section */}
      <div className="flex flex-col items-center pt-3 pb-2 px-1 gap-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
          {format(date, 'EEE')}
        </span>

        <span className={`text-[18px] font-bold leading-none ${dateColor}`}>
          {format(date, 'd')}
        </span>
      </div>

      {/* Total time row — flush to the bottom of the header */}
      <div
        className={`flex flex-col items-center justify-center h-9 border-t border-border/30 ${
          isToday ? 'bg-primary/5' : 'bg-background'
        }`}
      >
        <span
          className={[
            'font-mono text-[13px] font-semibold leading-none',
            hasLogs ? 'text-primary' : 'text-muted-foreground/30',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {formatMins(totalMins)}
        </span>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex justify-center"
        style={{ top: 'calc(100% + 8px)' }}
        data-date={dateStr}
      >
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddLog(dateStr);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.stopPropagation();
            onAddLog(dateStr);
          }}
          className="pointer-events-auto inline-flex h-7 items-center justify-center rounded-md border border-input bg-background/95 px-3 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
          aria-label={`Add worklog for ${format(date, 'EEEE, MMMM d')}`}
        >
          <Plus className="size-3 mr-1.5" strokeWidth={2.5} />
          Add worklog
        </span>
      </div>
    </div>
  );

  const tooltipLabel = leave?.leaveType.name ?? holiday?.name ?? null;

  if (tooltipLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{headerContent}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>
    );
  }

  return headerContent;
}

// ─── Time gutter header — shows the week total ────────────────────────────────

interface GutterHeaderProps {
  totalWeekLabel: string;
}

function TimeGutterHeader({ totalWeekLabel }: Readonly<GutterHeaderProps>) {
  return (
    <div
      className="flex flex-col h-full bg-background"
    >
      {/* Spacer that matches the date + day-name area */}
      <div className="flex-1" />
      {/* Week total — aligns with the per-day total row */}
      <div
        className="flex flex-col items-center justify-center h-9 border-t border-border/30"
      >
        <span
          className="font-mono text-[13px] font-semibold text-primary"
        >
          {totalWeekLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BulkAttendanceCalendarProps {
  weekStart: Date;
  dayMap: Map<string, BulkDayState>;
  holidays: HolidayRecord[];
  leaveRequests: LeaveRequestRecord[];
  onOpenCreate: (date: string, slotStart?: Date, slotEnd?: Date) => void;
  onOpenEdit: (date: string, log: LocalWorkLog) => void;
  onDeleteLog: (date: string, logId: string) => Promise<void>;
  onDragLog: (
    sourceDate: string,
    logId: string,
    newStart: Date,
    newEnd: Date,
    targetDate: string,
  ) => Promise<void>;
}

export function BulkAttendanceCalendar({
  weekStart,
  dayMap,
  holidays,
  leaveRequests,
  onOpenCreate,
  onOpenEdit,
  onDeleteLog,
  onDragLog,
}: Readonly<BulkAttendanceCalendarProps>) {
  const events = useMemo(() => logsToEvents(dayMap), [dayMap]);

  // Build a map of date string → holiday for fast lookup
  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayRecord>();
    for (const h of holidays) {
      if (h.isHoliday) {
        map.set(h.holidayDate, h);
      }
    }
    return map;
  }, [holidays]);

  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequestRecord>();
    for (const leave of leaveRequests) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let current = start; current <= end; current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)) {
        map.set(dateToYMD(current), leave);
      }
    }
    return map;
  }, [leaveRequests]);

  const totalWeekMins = useMemo(() => {
    return Array.from(dayMap.values()).reduce((sum, day) => {
      return sum + day.logs.reduce((s, l) => s + Math.round((l.endTime.getTime() - l.startTime.getTime()) / 60_000), 0);
    }, 0);
  }, [dayMap]);

  const totalWeekLabel = formatMins(totalWeekMins);

  // ── Custom components ───────────────────────────────────────────────────────
  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarWorkLogEvent }) => (
        <BulkAttendanceEvent
          event={event}
          onEdit={(ev) => {
            const day = dayMap.get(ev.resource.date);
            const log = day?.logs.find((l) => l.id === ev.id);
            if (log) onOpenEdit(ev.resource.date, log);
          }}
          onDelete={(ev) => {
            void onDeleteLog(ev.resource.date, ev.id);
          }}
        />
      ),
      week: {
        header: ({ date }: { date: Date }) => (
          <DayColumnHeader
            date={date}
            dayMap={dayMap}
            holidayMap={holidayMap}
            leaveMap={leaveMap}
            onAddLog={onOpenCreate}
          />
        ),
      },
      timeGutterHeader: () => (
        <TimeGutterHeader totalWeekLabel={totalWeekLabel} />
      ),
      toolbar: () => null,
    }),
    [dayMap, holidayMap, leaveMap, onOpenCreate, onOpenEdit, onDeleteLog, totalWeekLabel],
  );

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleEventDrop = useCallback(
    ({ event, start, end }: { event: CalendarWorkLogEvent; start: Date | string; end: Date | string }) => {
      const newStart = start instanceof Date ? start : new Date(start);
      const newEnd = end instanceof Date ? end : new Date(end);
      const targetDate = dateToYMD(newStart);
      void onDragLog(event.resource.date, event.id, newStart, newEnd, targetDate);
    },
    [onDragLog],
  );

  const handleEventResize = useCallback(
    ({ event, start, end }: { event: CalendarWorkLogEvent; start: Date | string; end: Date | string }) => {
      const newStart = start instanceof Date ? start : new Date(start);
      const newEnd = end instanceof Date ? end : new Date(end);
      const targetDate = dateToYMD(newStart);
      void onDragLog(event.resource.date, event.id, newStart, newEnd, targetDate);
    },
    [onDragLog],
  );

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date | string; end: Date | string; slots: Date[] | string[] }) => {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const dateStr = dateToYMD(startDate);
      onOpenCreate(dateStr, startDate, endDate);
    },
    [onOpenCreate],
  );

  return (
    <div
      className="h-full bg-card text-foreground"
    >
      <style>{`
        /* ── Reset & base ── */
        .rbc-calendar {
          font-family: var(--font-sans) !important;
          background: transparent !important;
          color: var(--foreground) !important;
          min-height: 100% !important;
          height: auto !important;
        }
 
        /* ── Time view shell ── */
        .rbc-time-view {
          border: none !important;
          display: flex;
          flex-direction: column;
          min-height: 100% !important;
          height: auto !important;
        }
 
        /* ── Header area ── */
        .rbc-time-header {
          border-bottom: 1px solid var(--border) !important;
          background: var(--background) !important;
          flex-shrink: 0 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 20 !important;
        }
        .rbc-time-header.rbc-overflowing {
          border-right: none !important;
        }
        .rbc-time-header-gutter {
          background: var(--background) !important;
          border-right: 1px solid var(--border) !important;
        }
        .rbc-time-header-content {
          border-left: none !important;
        }
        .rbc-time-header,
        .rbc-time-header-content,
        .rbc-time-header-gutter,
        .rbc-time-header > .rbc-row:first-child,
        .rbc-time-header .rbc-header {
          overflow: visible !important;
        }
 
        /* ── Column headers ── */
        .rbc-header {
          border-bottom: none !important;
          padding: 0 !important;
          background: var(--background) !important;
          overflow: visible !important;
        }
        .rbc-header + .rbc-header {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-header > * {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
 
        /* ── All-day row ── */
        .rbc-allday-cell { display: none !important; }
        .rbc-time-header-content > .rbc-row.rbc-row-resource { display: none !important; }
 
        /* ── Time body ── */
        .rbc-time-content {
          border-top: none !important;
          flex: 0 0 auto !important;
          overflow: visible !important;
        }
 
        /* ── Day columns with sticky button ── */
        .rbc-day-slot {
          position: relative !important;
        }
        .rbc-time-column {
          position: relative !important;
        }
 
        /* ── Time gutter ── */
        .rbc-time-gutter {
          background: var(--background) !important;
          border-right: 1px solid var(--border) !important;
        }
        .rbc-label {
          font-size: 11px !important;
          font-family: var(--font-mono) !important;
          color: var(--muted-foreground) !important;
          padding: 0 10px 0 4px !important;
          line-height: 1 !important;
        }
 
        /* ── Slot rows ── */
        .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
          min-height: 48px !important;
        }
        .rbc-time-slot {
          border-top: 1px solid var(--border) !important;
          opacity: 0.3;
        }
 
        /* ── Column dividers ── */
        .rbc-time-content > * + * > * {
          border-left: 1px solid var(--border) !important;
        }
 
        /* ── Today column ── */
        .rbc-today { 
          background: color-mix(in srgb, var(--primary) 4%, transparent) !important; 
        }
 
        /* ── Current time indicator ── */
        .rbc-current-time-indicator {
          background-color: var(--primary) !important;
          height: 2px !important;
          border-radius: 9999px !important;
          opacity: 0.6 !important;
        }
        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 1;
        }
 
        /* ── Events ── */
        .rbc-event {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .rbc-event:focus { outline: none !important; }
        .rbc-event-label { display: none !important; }
        .rbc-event-content {
          flex: 1 1 auto !important;
          height: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
        }
        .rbc-event.rbc-selected {
          background: transparent !important;
          box-shadow: none !important;
        }
 
        /* ── Slot selection ── */
        .rbc-slot-selection {
          background: color-mix(in srgb, var(--primary) 8%, transparent) !important;
          border: 1px dashed color-mix(in srgb, var(--primary) 30%, transparent) !important;
          border-radius: 4px !important;
        }
 
        /* ── DnD ── */
        .rbc-addons-dnd .rbc-addons-dnd-drag-preview { opacity: 0.75; }
        .rbc-addons-dnd-resizable {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        .rbc-addons-dnd-resizable > .rbc-event-content { flex: 1 1 auto; width: 100%; }
        .rbc-addons-dnd-resizable > div:not(.rbc-addons-dnd-resize-ns-anchor) { min-height: 0; width: 100%; }
        .rbc-addons-dnd-resize-ns-anchor {
          height: 6px;
          cursor: ns-resize;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rbc-addons-dnd-resize-ns-anchor .rbc-addons-dnd-resize-ns-icon {
          display: block;
          width: 20px;
          height: 2px;
          background: var(--primary);
          border-radius: 2px;
          opacity: 0.5;
        }
 
        /* ── Kill default toolbar ── */
        .rbc-toolbar { display: none !important; }
 
        /* ── Off-range ── */
        .rbc-off-range-bg { background: var(--background) !important; }
      `}</style>

      <DnDCalendar
        localizer={localizer}
        events={events}
        defaultView={Views.WEEK}
        view={Views.WEEK}
        date={weekStart}
        onNavigate={() => {/* controlled externally */}}
        step={15}
        timeslots={4}
        min={new Date(0, 0, 0, 8, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
        selectable
        resizable
        draggableAccessor={() => true}
        resizableAccessor={() => true}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        components={components}
        className="min-h-full"
        formats={{
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
        }}
        dayLayoutAlgorithm="no-overlap"
        showMultiDayTimes={false}
        popup={false}
        tooltipAccessor={() => ''}
      />
    </div>
  );
}
