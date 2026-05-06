'use client';

import { useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { format, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';

import { BulkAttendanceEvent } from './BulkAttendanceEvent';
import { BulkAttendanceEmptyState } from './BulkAttendanceEmptyState';

import type {
  BulkDayState,
  CalendarWorkLogEvent,
  LocalWorkLog,
} from '@/modules/attendance/types/bulkAttendanceTypes';

// ─── react-big-calendar setup ─────────────────────────────────────────────────

moment.updateLocale('en', {
  week: {
    dow: 1,
    doy: 4,
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
  onAddLog: (date: string) => void;
}

function DayColumnHeader({ date, dayMap, onAddLog }: Readonly<DayHeaderProps>) {
  const dateStr = dateToYMD(date);
  const day = dayMap.get(dateStr);
  const isToday = isSameDay(date, new Date());

  const totalMins = day?.logs.reduce((sum, l) => {
    const diff = l.endTime.getTime() - l.startTime.getTime();
    return sum + Math.round(diff / 60_000);
  }, 0) ?? 0;

  const hasLogs = totalMins > 0;

  return (
    <div className="flex flex-col h-full relative group">
      {/* Date section */}
      <div className="flex flex-col items-center pt-3 pb-2 px-1 gap-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-neutral-400)' }}
        >
          {format(date, 'EEE')}
        </span>

        <span
          className="text-[18px] font-semibold leading-none flex items-center justify-center"
          style={
            isToday
              ? {
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: 16,
                }
              : { color: 'var(--color-neutral-900)' }
          }
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* Total time row — flush to the bottom of the header */}
      <div
        className="flex flex-col items-center justify-center h-9 border-t"
        style={{
          borderTopColor: 'var(--color-neutral-100)',
          backgroundColor: isToday ? 'var(--color-primary-ghost)' : 'var(--color-canvas)',
        }}
      >
        <span
          className="font-mono text-[13px] font-semibold leading-none"
          style={{ color: hasLogs ? 'var(--color-neutral-900)' : 'var(--color-neutral-300)' }}
        >
          {formatMins(totalMins)}
        </span>
      </div>

      {/* Add button */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Add work log for ${format(date, 'EEEE d MMMM')}`}
        onClick={(e) => { e.stopPropagation(); onAddLog(dateStr); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onAddLog(dateStr); } }}
        className="absolute top-2.5 right-2 size-5 flex items-center justify-center rounded text-neutral-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </div>
    </div>
  );
}

// ─── Time gutter header — shows the week total ────────────────────────────────

interface GutterHeaderProps {
  totalWeekLabel: string;
}

function TimeGutterHeader({ totalWeekLabel }: Readonly<GutterHeaderProps>) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-canvas)' }}
    >
      {/* Spacer that matches the date + day-name area */}
      <div className="flex-1" />
      {/* Week total — aligns with the per-day total row */}
      <div
        className="flex flex-col items-center justify-center h-9 border-t"
        style={{ borderTopColor: 'var(--color-neutral-100)' }}
      >
        <span
          className="font-mono text-[13px] font-semibold"
          style={{ color: 'var(--color-primary)' }}
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
  onOpenCreate,
  onOpenEdit,
  onDeleteLog,
  onDragLog,
}: Readonly<BulkAttendanceCalendarProps>) {
  const events = useMemo(() => logsToEvents(dayMap), [dayMap]);
  const hasAnyLogs = events.length > 0;

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
            onAddLog={onOpenCreate}
          />
        ),
      },
      timeGutterHeader: () => (
        <TimeGutterHeader totalWeekLabel={totalWeekLabel} />
      ),
      toolbar: () => null,
    }),
    [dayMap, onOpenCreate, onOpenEdit, onDeleteLog, totalWeekLabel],
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
      className="border border-neutral-100 rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-1)' }}
    >
      <style>{`
        /* ── Reset & base ── */
        .rbc-calendar {
          font-family: var(--font-sans) !important;
          background: transparent !important;
          color: var(--color-neutral-900) !important;
        }

        /* ── Time view shell ── */
        .rbc-time-view {
          border: none !important;
          display: flex;
          flex-direction: column;
        }

        /* ── Header area ── */
        .rbc-time-header {
          border-bottom: 1px solid var(--color-neutral-100) !important;
          align-items: stretch !important;
          background: var(--color-canvas) !important;
        }
        .rbc-time-header-gutter {
          background: var(--color-canvas) !important;
          border-right: 1px solid var(--color-neutral-100) !important;
          flex-shrink: 0;
        }
        .rbc-time-header-content {
          border-left: none !important;
        }

        /* ── Column headers ── */
        .rbc-header {
          height: 100% !important;
          border-bottom: none !important;
          padding: 0 !important;
          background: var(--color-canvas) !important;
          border-left: 1px solid var(--color-neutral-100) !important;
          overflow: visible !important;
        }
        .rbc-header:first-child {
          border-left: none !important;
        }
        /* RBC wraps headers in a button — strip all button styles */
        .rbc-header > button {
          all: unset;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          cursor: default !important;
        }

        /* ── All-day row — hide it, we don't use it ── */
        .rbc-allday-cell { display: none !important; }
        .rbc-time-header-content > .rbc-row.rbc-row-resource { display: none !important; }

        /* ── Time body ── */
        .rbc-time-content {
          border-top: none !important;
          flex: 1;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--color-neutral-200) transparent;
        }
        .rbc-time-content::-webkit-scrollbar { width: 6px; }
        .rbc-time-content::-webkit-scrollbar-thumb {
          background: var(--color-neutral-200);
          border-radius: 9999px;
        }

        /* ── Time gutter (labels) ── */
        .rbc-time-gutter {
          background: var(--color-canvas) !important;
          border-right: 1px solid var(--color-neutral-100) !important;
        }
        .rbc-label {
          font-size: 11px !important;
          font-family: var(--font-mono) !important;
          color: var(--color-neutral-400) !important;
          padding: 0 10px 0 4px !important;
          line-height: 1 !important;
        }

        /* ── Slot rows ── */
        .rbc-timeslot-group {
          border-bottom: 1px solid var(--color-neutral-100) !important;
          min-height: 48px !important;
        }
        .rbc-time-slot {
          border-top: 1px solid var(--color-neutral-50) !important;
        }
        .rbc-day-slot {
          border-left: 1px solid var(--color-neutral-100) !important;
        }
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid var(--color-neutral-50) !important;
        }

        /* ── Today column ── */
        .rbc-today { background: var(--color-primary-ghost) !important; }

        /* ── Current time indicator ── */
        .rbc-current-time-indicator {
          background-color: var(--color-primary) !important;
          height: 2px !important;
          border-radius: 9999px !important;
        }
        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -4px;
          top: -3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-primary);
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
          background: var(--color-primary-ghost) !important;
          border: 1px dashed var(--color-primary-subtle) !important;
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
          background: var(--color-primary);
          border-radius: 2px;
          opacity: 0.5;
        }

        /* ── Kill default toolbar ── */
        .rbc-toolbar { display: none !important; }

        /* ── Off-range ── */
        .rbc-off-range-bg { background: var(--color-canvas) !important; }
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
        min={new Date(0, 0, 0, 6, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
        selectable
        resizable
        draggableAccessor={() => true}
        resizableAccessor={() => true}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        components={components}
        style={{ height: 680 }}
        formats={{
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
        }}
        dayLayoutAlgorithm="no-overlap"
        showMultiDayTimes={false}
        popup={false}
      />

      {/* Empty state */}
      {!hasAnyLogs && (
        <div className="border-t border-neutral-100 bg-canvas/50">
          <BulkAttendanceEmptyState />
        </div>
      )}
    </div>
  );
}
