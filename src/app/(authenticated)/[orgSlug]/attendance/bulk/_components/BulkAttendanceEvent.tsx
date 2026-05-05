'use client';

import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import type { CalendarWorkLogEvent } from '@/modules/attendance/types/bulkAttendanceTypes';

interface BulkAttendanceEventProps {
  event: CalendarWorkLogEvent;
  onEdit: (event: CalendarWorkLogEvent) => void;
  onDelete: (event: CalendarWorkLogEvent) => void;
}

export function BulkAttendanceEvent({
  event,
  onEdit,
  onDelete,
}: Readonly<BulkAttendanceEventProps>) {
  const startStr = format(event.start, 'HH:mm');
  const endStr = format(event.end, 'HH:mm');
  const durationMs = event.end.getTime() - event.start.getTime();
  const durationMins = Math.max(1, Math.round(durationMs / 60_000));
  const durationH = Math.floor(durationMins / 60);
  const durationM = durationMins % 60;
  const durationLabel =
    durationH > 0 && durationM > 0
      ? `${durationH}h ${durationM}m`
      : durationH > 0
        ? `${durationH}h`
        : `${durationM}m`;

  const isOptimistic = event.resource.isOptimistic;
  const title = event.resource.title;
  const notes = event.resource.notes;

  return (
    <div
      className={[
        'group relative h-full w-full rounded-md px-2 py-1 overflow-hidden border',
        'transition-colors duration-100 cursor-pointer select-none',
        isOptimistic ? 'opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: '#dbeafe',
        borderColor: '#2563eb',
        color: '#000000',
        boxShadow: '0 1px 3px rgb(0 0 0 / 0.18)',
      }}
      role="button"
      tabIndex={0}
      aria-label={`${title ?? 'Work log'} ${startStr}–${endStr}`}
      onClick={() => onEdit(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(event); }}
    >
      {/* Time range */}
      <p className="font-mono text-[10px] leading-tight truncate" style={{ color: '#000000' }}>
        {startStr}–{endStr} · {durationLabel}
      </p>

      {/* Title — primary label */}
      {title && (
        <p className="text-[11px] font-semibold leading-tight truncate mt-0.5" style={{ color: '#000000' }}>
          {title}
        </p>
      )}

      {/* Notes — secondary */}
      {notes && (
        <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: '#000000' }}>
          {notes}
        </p>
      )}

      {/* Action buttons — visible on hover */}
      <div className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Edit work log"
          onClick={(e) => { e.stopPropagation(); onEdit(event); }}
          className="size-5 flex items-center justify-center rounded bg-surface/80 hover:bg-surface text-neutral-500 hover:text-neutral-900 transition-colors duration-100"
        >
          <Pencil className="size-2.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Delete work log"
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          className="size-5 flex items-center justify-center rounded bg-surface/80 hover:bg-destructive-bg text-neutral-500 hover:text-destructive-text transition-colors duration-100"
        >
          <Trash2 className="size-2.5" strokeWidth={2} />
        </button>
      </div>

      {/* Optimistic saving indicator */}
      {isOptimistic && (
        <div className="absolute bottom-0.5 right-1">
          <div className="size-1.5 rounded-full bg-warning animate-pulse" />
        </div>
      )}
    </div>
  );
}
