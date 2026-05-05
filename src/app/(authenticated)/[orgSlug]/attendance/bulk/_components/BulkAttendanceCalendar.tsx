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

  const totalLabel = totalMins > 0
    ? totalMins >= 60
      ? `${Math.floor(totalMins / 60)}h${totalMins % 60 > 0 ? ` ${totalMins % 60}m` : ''}`
      : `${totalMins}m`
    : null;

  return (
    <div className="flex flex-col items-center gap-0.5 py-2 px-1 relative group">
      {/* Weekday */}
      <span className={`text-[11px] font-medium uppercase tracking-wider ${isToday ? 'text-primary' : 'text-neutral-500'}`}>
        {format(date, 'EEE')}
      </span>

      {/* Date number */}
      <span
        className={[
          'text-[17px] font-semibold leading-none',
          isToday
            ? 'size-8 flex items-center justify-center rounded-full bg-primary text-white'
            : 'text-neutral-900',
        ].join(' ')}
      >
        {format(date, 'd')}
      </span>

      {/* Total span summary */}
      {totalLabel && (
        <span className="text-[10px] font-mono text-neutral-400 mt-0.5">{totalLabel}</span>
      )}

      {/* Add button — div to avoid nested <button> inside RBC's header button */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Add work log for ${format(date, 'EEEE d MMMM')}`}
        onClick={(e) => { e.stopPropagation(); onAddLog(dateStr); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onAddLog(dateStr); } }}
        className="absolute top-1 right-1 size-5 flex items-center justify-center rounded bg-transparent text-neutral-300 hover:bg-primary-ghost hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-100 cursor-pointer"
      >
        <Plus className="size-3" strokeWidth={2.5} />
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

  // ── Custom components ────────────────────────────────────────────────────────
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
      // week.header = the column header cell in the week time-grid
      week: {
        header: ({ date }: { date: Date }) => (
          <DayColumnHeader
            date={date}
            dayMap={dayMap}
            onAddLog={onOpenCreate}
          />
        ),
      },
      // Hide the default toolbar — we use our own
      toolbar: () => null,
    }),
    [dayMap, onOpenCreate, onOpenEdit, onDeleteLog],
  );

  // ── Drag and drop handler ────────────────────────────────────────────────────
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

  // ── Slot selection (click/drag on empty slot) ────────────────────────────────
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date | string; end: Date | string; slots: Date[] | string[] }) => {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const dateStr = dateToYMD(startDate);
      onOpenCreate(dateStr, startDate, endDate);
    },
    [onOpenCreate],
  );

  // ── Calendar range ───────────────────────────────────────────────────────────
  const calendarDate = weekStart;

  return (
    <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) overflow-hidden">
      {/* react-big-calendar styles override wrapper */}
      <style>{`
        /* ── Force time-grid layout ── */
        .rbc-calendar { font-family: var(--font-sans) !important; background: transparent !important; }
        .rbc-time-view { border: none !important; display: flex; flex-direction: column; }
        .rbc-time-header { border-bottom: 1px solid var(--color-neutral-100) !important; }
        .rbc-time-header-content { border-left: 1px solid var(--color-neutral-100) !important; }
        .rbc-time-header-gutter { background: var(--color-canvas) !important; }
        .rbc-header { border-bottom: none !important; padding: 0 !important; background: var(--color-canvas) !important; border-left: 1px solid var(--color-neutral-100) !important; }
        .rbc-header:first-child { border-left: none !important; }
        .rbc-time-content { border-top: 1px solid var(--color-neutral-100) !important; flex: 1; overflow-y: auto; }
        .rbc-time-gutter { background: var(--color-canvas) !important; }
        .rbc-timeslot-group { border-bottom: 1px solid var(--color-neutral-100) !important; min-height: 48px !important; }
        .rbc-time-slot { border-top: 1px solid var(--color-neutral-50) !important; }
        .rbc-day-slot { border-left: 1px solid var(--color-neutral-100) !important; }
        .rbc-day-slot .rbc-time-slot { border-top: 1px solid var(--color-neutral-50) !important; }
        .rbc-current-time-indicator { background-color: var(--color-primary) !important; height: 2px !important; }
        .rbc-label { font-size: 11px !important; font-family: var(--font-mono) !important; color: var(--color-neutral-400) !important; padding: 0 8px !important; }
        .rbc-event {
          background: #dbeafe !important;
          border: 1px solid #2563eb !important;
          color: #000 !important;
          padding: 0 !important;
          border-radius: 6px !important;
          min-height: 18px !important;
          display: flex !important;
          flex-direction: column !important;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.18) !important;
        }
        .rbc-event-label { display: none !important; }
        .rbc-event-content {
          flex: 1 1 auto !important;
          height: 100% !important;
          min-height: 100% !important;
          width: 100% !important;
          color: #000 !important;
        }
        .rbc-event-content * { color: #000 !important; }
        .rbc-event:focus { outline: 2px solid var(--color-primary) !important; outline-offset: 1px !important; }
        .rbc-event.rbc-selected { background: #bfdbfe !important; border-color: #1d4ed8 !important; box-shadow: 0 1px 4px rgb(0 0 0 / 0.22) !important; }
        .rbc-slot-selection { background: var(--color-primary-ghost) !important; border: 1px solid var(--color-primary-subtle) !important; }
        .rbc-today { background: var(--color-primary-ghost) !important; }
        .rbc-off-range-bg { background: var(--color-canvas) !important; }
        .rbc-show-more { color: var(--color-primary) !important; font-size: 11px !important; }
        /* DnD addon */
        .rbc-addons-dnd .rbc-addons-dnd-drag-preview { opacity: 0.8; }
        .rbc-addons-dnd-resizable { display: flex; flex-direction: column; height: 100%; width: 100%; }
        .rbc-addons-dnd-resizable > .rbc-event-content { flex: 1 1 auto; width: 100%; }
        .rbc-addons-dnd-resizable > div:not(.rbc-addons-dnd-resize-ns-anchor) { min-height: 0; width: 100%; }
        .rbc-addons-dnd-resize-ns-anchor { height: 6px; cursor: ns-resize; }
        .rbc-addons-dnd-resize-ns-anchor .rbc-addons-dnd-resize-ns-icon { display: block; width: 20px; height: 3px; background: var(--color-primary); border-radius: 2px; margin: 0 auto; }
        /* Remove default toolbar if it sneaks through */
        .rbc-toolbar { display: none !important; }
      `}</style>

      <DnDCalendar
        localizer={localizer}
        events={events}
        defaultView={Views.WEEK}
        view={Views.WEEK}
        date={calendarDate}
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

      {/* Empty state overlay */}
      {!hasAnyLogs && (
        <div className="border-t border-neutral-100 bg-canvas/50">
          <BulkAttendanceEmptyState />
        </div>
      )}
    </div>
  );
}
