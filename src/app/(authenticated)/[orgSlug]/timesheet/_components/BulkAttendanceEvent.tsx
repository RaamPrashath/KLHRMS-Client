'use client';

import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CalendarWorkLogEvent } from '@/modules/attendance/types/bulkAttendanceTypes';
import type { ProjectForAttendance } from '@/modules/projects/types/projectTypes';

interface BulkAttendanceEventProps {
  event: CalendarWorkLogEvent;
  projects?: ProjectForAttendance[];
  onEdit: (event: CalendarWorkLogEvent) => void;
  onDelete: (event: CalendarWorkLogEvent) => void;
}

export function BulkAttendanceEvent({
  event,
  projects = [],
  onEdit,
  onDelete,
}: Readonly<BulkAttendanceEventProps>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureDate = event.start > today;
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

  // Try to match a ticket ID pattern (e.g. FIPFS-13124, TEII-2)
  const textToSearch = `${title ?? ''} ${notes ?? ''}`;
  const ticketMatch = textToSearch.match(/[A-Z0-9]{2,6}-\d{1,6}/i);
  const ticketId = ticketMatch ? ticketMatch[0].toUpperCase() : null;

  const eventBody = (
    <div
      className={[
        'group relative h-full w-full overflow-hidden select-none',
        isFutureDate ? 'cursor-default' : 'cursor-pointer',
        'transition-all duration-150',
        'border border-border/80 rounded-xl',
        'bg-card hover:bg-muted/10',
        isFutureDate ? '' : 'hover:border-primary/45 hover:shadow-sm',
        isOptimistic ? 'opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={isFutureDate ? undefined : 'button'}
      tabIndex={isFutureDate ? undefined : 0}
      aria-label={`${title ?? 'Work log'} ${startStr}–${endStr}`}
      onClick={isFutureDate ? undefined : () => onEdit(event)}
      onKeyDown={isFutureDate ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(event); }}
    >
      <div className="px-3 py-2.5 h-full flex flex-col justify-between gap-1 text-left">
        <div className="flex flex-col gap-1 overflow-hidden">
          {title ? (
            <p className="text-xs font-semibold leading-snug text-foreground line-clamp-2">
              {title}
            </p>
          ) : (
            <p className="text-xs font-semibold leading-snug text-foreground/80 italic">
              Work Log
            </p>
          )}

          {notes && (
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words line-clamp-3">
              {notes}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30 gap-1.5 shrink-0">
          {ticketId ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold tracking-tight">
              <svg className="size-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{ticketId}</span>
            </div>
          ) : (
            <div className="w-1" />
          )}

          <span className="text-[10px] font-bold text-muted-foreground font-mono bg-muted/65 px-1.5 py-0.5 rounded border border-border/30">
            {durationLabel}
          </span>
        </div>
      </div>

      <div
        className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {isFutureDate ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="size-5.5 flex items-center justify-center rounded-md bg-background border border-border text-muted-foreground/40 cursor-not-allowed">
                <Pencil className="size-3" strokeWidth={2.5} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Can't edit log for future dates</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            aria-label="Edit work log"
            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
            className="size-5.5 flex items-center justify-center rounded-md bg-background border border-border text-muted-foreground hover:text-primary transition-colors duration-100 shadow-sm"
          >
            <Pencil className="size-3" strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete work log"
          onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          className="size-5.5 flex items-center justify-center rounded-md bg-background border border-border text-muted-foreground hover:text-destructive transition-colors duration-100 shadow-sm"
        >
          <Trash2 className="size-3" strokeWidth={2.5} />
        </button>
      </div>

      {isOptimistic && (
        <div className="absolute bottom-1.5 right-1.5">
          <div className="size-1.5 rounded-full bg-warning animate-pulse" />
        </div>
      )}
    </div>
  );

  if (isFutureDate) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{eventBody}</TooltipTrigger>
        <TooltipContent side="top">Can't edit log for future dates</TooltipContent>
      </Tooltip>
    );
  }

  return eventBody;
}
