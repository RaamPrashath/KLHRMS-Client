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
        'group relative h-full w-full overflow-hidden cursor-pointer select-none',
        'transition-all duration-150',
        'border border-border rounded-lg',
        'bg-green-500/5',
        'hover:border-primary/40 hover:shadow-sm hover:bg-green-500/8',
        isOptimistic ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      aria-label={`${title ?? 'Work log'} ${startStr}–${endStr}`}
      onClick={() => onEdit(event)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(event); }}
    >
      <div className="px-3 py-2 h-full flex flex-col gap-1">
        {/* Time + duration */}
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-xs leading-tight font-medium text-foreground">
            {startStr} - {endStr}
          </p>
          <p className="font-mono text-xs leading-tight font-medium text-muted-foreground">
            {durationLabel}
          </p>
        </div>

        {/* Title */}
        {title && (
          <p className="text-sm font-semibold leading-tight text-foreground line-clamp-1">
            {title}
          </p>
        )}

        {/* Notes */}
        {notes && (
          <p className="text-xs leading-relaxed text-muted-foreground break-words line-clamp-3">
            {notes}
          </p>
        )}
      </div>

      {/* Hover action strip */}
      <div
        className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Edit work log"
          onClick={(e) => { e.stopPropagation(); onEdit(event); }}
          className="size-5 flex items-center justify-center rounded-sm bg-white/90 backdrop-blur-sm text-neutral-500 hover:text-primary transition-colors duration-100 shadow-sm"
        >
          <Pencil className="size-2.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Delete work log"
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          className="size-5 flex items-center justify-center rounded-sm bg-white/90 backdrop-blur-sm text-neutral-500 hover:text-destructive-text transition-colors duration-100 shadow-sm"
        >
          <Trash2 className="size-2.5" strokeWidth={2} />
        </button>
      </div>

      {/* Saving pulse dot */}
      {isOptimistic && (
        <div className="absolute bottom-1 right-1">
          <div
            className="size-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--color-warning-text)' }}
          />
        </div>
      )}
    </div>
  );
}
