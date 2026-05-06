'use client';

import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  parseDurationToMinutes,
  formatMinutesToDuration,
  addMinutesToDate,
  computeDurationMinutes,
} from '@/modules/attendance/hooks/use-duration-parser';
import type { LocalWorkLog } from '@/modules/attendance/types/bulkAttendanceTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTimeInput(d: Date): string {
  return format(d, 'HH:mm');
}

/**
 * Parse "HH:mm" + "YYYY-MM-DD" into a local-time Date.
 * Uses explicit Date constructor parts — no UTC shift.
 */
function fromTimeInput(timeStr: string, dateStr: string): Date | null {
  if (!timeStr || !dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (
      year === undefined || month === undefined || day === undefined ||
      hours === undefined || minutes === undefined
    ) return null;
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkLogFormValues {
  startTime: Date;
  endTime: Date;
  title: string | null;
  notes: string | null;
}

interface WorkLogFormProps {
  date: string;
  initialLog: LocalWorkLog | null;
  /** Pre-fill start time (used when opening from a dragged slot) */
  defaultStart?: Date;
  /** Pre-fill end time (used when opening from a dragged slot) */
  defaultEnd?: Date;
  onSubmit: (values: WorkLogFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkLogForm({
  date,
  initialLog,
  defaultStart,
  defaultEnd,
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = 'Save',
}: Readonly<WorkLogFormProps>) {

  // Resolve initial times: prefer initialLog, then defaultStart/End, then 09:00/10:00
  const resolvedStart = initialLog?.startTime ?? defaultStart;
  const resolvedEnd = initialLog?.endTime ?? defaultEnd;

  const [startTimeStr, setStartTimeStr] = useState<string>(() =>
    resolvedStart ? toTimeInput(resolvedStart) : '09:00',
  );
  const [endTimeStr, setEndTimeStr] = useState<string>(() =>
    resolvedEnd ? toTimeInput(resolvedEnd) : '10:00',
  );
  const [durationStr, setDurationStr] = useState<string>(() => {
    if (resolvedStart && resolvedEnd) {
      const mins = computeDurationMinutes(resolvedStart, resolvedEnd);
      return formatMinutesToDuration(mins);
    }
    return '1 hr';
  });
  const [title, setTitle] = useState<string>(initialLog?.title ?? '');
  const [notes, setNotes] = useState<string>(initialLog?.notes ?? '');
  const [errors, setErrors] = useState<{
    title?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
  }>({});

  // Tracks last edited field to prevent circular sync
  const lastEditedRef = useRef<'start' | 'end' | 'duration' | null>(null);

  // ── Sync: end → duration ──────────────────────────────────────────────────
  const syncDurationFromEnd = useCallback(
    (newEndStr: string) => {
      const start = fromTimeInput(startTimeStr, date);
      const end = fromTimeInput(newEndStr, date);
      if (start && end && end > start) {
        const mins = computeDurationMinutes(start, end);
        setDurationStr(formatMinutesToDuration(mins));
        setErrors((e) => ({ ...e, endTime: undefined, duration: undefined }));
      } else if (start && end && end <= start) {
        setErrors((e) => ({ ...e, endTime: 'End time must be after start time' }));
      }
    },
    [startTimeStr, date],
  );

  // ── Sync: duration → end ──────────────────────────────────────────────────
  const syncEndFromDuration = useCallback(
    (newDurationStr: string) => {
      const mins = parseDurationToMinutes(newDurationStr);
      const start = fromTimeInput(startTimeStr, date);
      if (mins && start) {
        const newEnd = addMinutesToDate(start, mins);
        setEndTimeStr(toTimeInput(newEnd));
        setErrors((e) => ({ ...e, duration: undefined, endTime: undefined }));
      } else if (newDurationStr.trim() && !mins) {
        setErrors((e) => ({ ...e, duration: 'Invalid duration format' }));
      }
    },
    [startTimeStr, date],
  );

  // ── Start change: keep duration, recalculate end ──────────────────────────
  const handleStartChange = useCallback(
    (newStartStr: string) => {
      lastEditedRef.current = 'start';
      setStartTimeStr(newStartStr);
      setErrors((e) => ({ ...e, startTime: undefined }));
      const mins = parseDurationToMinutes(durationStr);
      const start = fromTimeInput(newStartStr, date);
      if (mins && start) {
        setEndTimeStr(toTimeInput(addMinutesToDate(start, mins)));
      }
    },
    [durationStr, date],
  );

  const handleEndChange = useCallback(
    (newEndStr: string) => {
      lastEditedRef.current = 'end';
      setEndTimeStr(newEndStr);
      syncDurationFromEnd(newEndStr);
    },
    [syncDurationFromEnd],
  );

  const handleDurationChange = useCallback(
    (newDurationStr: string) => {
      lastEditedRef.current = 'duration';
      setDurationStr(newDurationStr);
      syncEndFromDuration(newDurationStr);
    },
    [syncEndFromDuration],
  );

  const handleEndBlur = useCallback(() => {
    syncDurationFromEnd(endTimeStr);
  }, [endTimeStr, syncDurationFromEnd]);

  const handleDurationBlur = useCallback(() => {
    const mins = parseDurationToMinutes(durationStr);
    if (mins) setDurationStr(formatMinutesToDuration(mins));
    syncEndFromDuration(durationStr);
  }, [durationStr, syncEndFromDuration]);

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const start = fromTimeInput(startTimeStr, date);
    const end = fromTimeInput(endTimeStr, date);
    const newErrors: typeof errors = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!start) newErrors.startTime = 'Invalid start time';
    if (!end) newErrors.endTime = 'Invalid end time';
    if (start && end && end <= start) newErrors.endTime = 'End time must be after start time';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      startTime: start!,
      endTime: end!,
      title: title.trim() || null,
      notes: notes.trim() || null,
    });
  }

  // Derived duration for helper text
  const startD = fromTimeInput(startTimeStr, date);
  const endD = fromTimeInput(endTimeStr, date);
  const derivedMins = startD && endD && endD > startD ? computeDurationMinutes(startD, endD) : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wl-title" className="text-[13px] font-medium text-neutral-700">
          Title <span className="text-destructive-text">*</span>
        </Label>
        <Input
          id="wl-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setErrors((er) => ({ ...er, title: undefined }));
          }}
          placeholder="e.g. Design review, Sprint planning"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs text-destructive-text">{errors.title}</p>
        )}
      </div>

      {/* Start / End row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wl-start" className="text-[13px] font-medium text-neutral-700">
            Start <span className="text-destructive-text">*</span>
          </Label>
          <Input
            id="wl-start"
            type="time"
            value={startTimeStr}
            onChange={(e) => handleStartChange(e.target.value)}
            className="font-mono"
            aria-invalid={!!errors.startTime}
          />
          {errors.startTime && (
            <p className="text-xs text-destructive-text">{errors.startTime}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wl-end" className="text-[13px] font-medium text-neutral-700">
            End <span className="text-destructive-text">*</span>
          </Label>
          <Input
            id="wl-end"
            type="time"
            value={endTimeStr}
            onChange={(e) => handleEndChange(e.target.value)}
            onBlur={handleEndBlur}
            className="font-mono"
            aria-invalid={!!errors.endTime}
          />
          {errors.endTime && (
            <p className="text-xs text-destructive-text">{errors.endTime}</p>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wl-duration" className="text-[13px] font-medium text-neutral-700">
          Duration
        </Label>
        <Input
          id="wl-duration"
          type="text"
          value={durationStr}
          onChange={(e) => handleDurationChange(e.target.value)}
          onBlur={handleDurationBlur}
          placeholder="e.g. 2 hrs 30 mins"
          aria-invalid={!!errors.duration}
        />
        {errors.duration ? (
          <p className="text-xs text-destructive-text">{errors.duration}</p>
        ) : derivedMins !== null ? (
          <p className="text-xs text-neutral-500">{formatMinutesToDuration(derivedMins)}</p>
        ) : null}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wl-notes" className="text-[13px] font-medium text-neutral-700">
          Description <span className="text-neutral-400 font-normal">(optional)</span>
        </Label>
        <textarea
          id="wl-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details…"
          rows={2}
          className="bg-surface border border-neutral-200 rounded-md px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 px-4 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors duration-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-9 px-4 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-2 transition-colors duration-100"
        >
          {isPending && (
            <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
