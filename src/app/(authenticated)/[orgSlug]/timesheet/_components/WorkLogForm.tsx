'use client';

import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ProjectTaskSelector } from '@/modules/attendance/components/ProjectTaskSelector';
import {
  addMinutesToDate,
  computeDurationMinutes,
  formatMinutesToDuration,
  parseDurationToMinutes,
} from '@/modules/attendance/hooks/use-duration-parser';
import type { LocalWorkLog } from '@/modules/attendance/types/bulkAttendanceTypes';
import type { ProjectForAttendance } from '@/modules/projects/types/projectTypes';

function toTimeInput(value: Date): string {
  return format(value, 'HH:mm');
}

function fromTimeInput(timeStr: string, dateStr: string): Date | null {
  if (!timeStr || !dateStr) return null;

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (
      year === undefined || month === undefined || day === undefined ||
      hours === undefined || minutes === undefined
    ) {
      return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

export interface WorkLogFormValues {
  startTime: Date;
  endTime: Date;
  projectId: string | null;
  projectTaskId: string | null;
  notes: string | null;
}

interface WorkLogFormProps {
  date: string;
  initialLog: LocalWorkLog | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  projects?: ProjectForAttendance[];
  onSubmit: (values: WorkLogFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
}

export function WorkLogForm({
  date,
  initialLog,
  defaultStart,
  defaultEnd,
  projects = [],
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = 'Save',
}: Readonly<WorkLogFormProps>) {
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
      return formatMinutesToDuration(
        computeDurationMinutes(resolvedStart, resolvedEnd),
      );
    }
    return '1 hr';
  });
  const [notes, setNotes] = useState(initialLog?.notes ?? '');
  const [projectId, setProjectId] = useState<string | null>(initialLog?.projectId ?? null);
  const [projectTaskId, setProjectTaskId] = useState<string | null>(initialLog?.projectTaskId ?? null);
  const [errors, setErrors] = useState<{
    project?: string;
    task?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
  }>({});

  const lastEditedRef = useRef<'start' | 'end' | 'duration' | null>(null);

  const syncDurationFromEnd = useCallback((nextEndTimeStr: string) => {
    const start = fromTimeInput(startTimeStr, date);
    const end = fromTimeInput(nextEndTimeStr, date);

    if (start && end && end > start) {
      setDurationStr(formatMinutesToDuration(computeDurationMinutes(start, end)));
      setErrors((current) => ({ ...current, endTime: undefined, duration: undefined }));
      return;
    }

    if (start && end && end <= start) {
      setErrors((current) => ({ ...current, endTime: 'End time must be after start time' }));
    }
  }, [date, startTimeStr]);

  const syncEndFromDuration = useCallback((nextDurationStr: string) => {
    const minutes = parseDurationToMinutes(nextDurationStr);
    const start = fromTimeInput(startTimeStr, date);

    if (minutes && start) {
      setEndTimeStr(toTimeInput(addMinutesToDate(start, minutes)));
      setErrors((current) => ({ ...current, duration: undefined, endTime: undefined }));
      return;
    }

    if (nextDurationStr.trim() && !minutes) {
      setErrors((current) => ({ ...current, duration: 'Invalid duration format' }));
    }
  }, [date, startTimeStr]);

  const handleStartChange = useCallback((nextStartTimeStr: string) => {
    lastEditedRef.current = 'start';
    setStartTimeStr(nextStartTimeStr);
    setErrors((current) => ({ ...current, startTime: undefined }));

    const minutes = parseDurationToMinutes(durationStr);
    const start = fromTimeInput(nextStartTimeStr, date);
    if (minutes && start) {
      setEndTimeStr(toTimeInput(addMinutesToDate(start, minutes)));
    }
  }, [date, durationStr]);

  const handleEndChange = useCallback((nextEndTimeStr: string) => {
    lastEditedRef.current = 'end';
    setEndTimeStr(nextEndTimeStr);
    syncDurationFromEnd(nextEndTimeStr);
  }, [syncDurationFromEnd]);

  const handleDurationChange = useCallback((nextDurationStr: string) => {
    lastEditedRef.current = 'duration';
    setDurationStr(nextDurationStr);
    syncEndFromDuration(nextDurationStr);
  }, [syncEndFromDuration]);

  const handleEndBlur = useCallback(() => {
    syncDurationFromEnd(endTimeStr);
  }, [endTimeStr, syncDurationFromEnd]);

  const handleDurationBlur = useCallback(() => {
    const minutes = parseDurationToMinutes(durationStr);
    if (minutes) {
      setDurationStr(formatMinutesToDuration(minutes));
    }
    syncEndFromDuration(durationStr);
  }, [durationStr, syncEndFromDuration]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const start = fromTimeInput(startTimeStr, date);
    const end = fromTimeInput(endTimeStr, date);
    const nextErrors: typeof errors = {};

    if (!projectId) nextErrors.project = 'Project is required';
    if (!projectTaskId) nextErrors.task = 'Task is required';
    if (!start) nextErrors.startTime = 'Invalid start time';
    if (!end) nextErrors.endTime = 'Invalid end time';
    if (start && end && end <= start) nextErrors.endTime = 'End time must be after start time';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      startTime: start!,
      endTime: end!,
      projectId,
      projectTaskId,
      notes: notes.trim() || null,
    });
  }

  const startDate = fromTimeInput(startTimeStr, date);
  const endDate = fromTimeInput(endTimeStr, date);
  const derivedMinutes =
    startDate && endDate && endDate > startDate
      ? computeDurationMinutes(startDate, endDate)
      : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <ProjectTaskSelector
        projects={projects}
        selectedProjectId={projectId}
        selectedTaskId={projectTaskId}
        onProjectChange={(id) => {
          setProjectId(id);
          if (id) {
            setErrors((current) => ({ ...current, project: undefined }));
          }
        }}
        onTaskChange={(id) => {
          setProjectTaskId(id);
          if (id) {
            setErrors((current) => ({ ...current, task: undefined }));
          }
        }}
        projectError={errors.project}
        taskError={errors.task}
        disabled={isPending}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wl-duration" className="text-[13px] font-medium text-neutral-700">
          Duration
        </Label>
        <Input
          id="wl-duration"
          type="text"
          value={durationStr}
          onChange={(event) => handleDurationChange(event.target.value)}
          onBlur={handleDurationBlur}
          placeholder="e.g. 2 hrs 30 mins"
          aria-invalid={!!errors.duration}
        />
        {errors.duration ? (
          <p className="text-xs font-medium text-destructive">{errors.duration}</p>
        ) : derivedMinutes !== null ? (
          <p className="text-xs font-medium text-muted-foreground">
            {formatMinutesToDuration(derivedMinutes)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wl-start" className="text-[13px] font-medium text-neutral-700">
            Start <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wl-start"
            type="time"
            value={startTimeStr}
            onChange={(event) => handleStartChange(event.target.value)}
            className="font-mono"
            aria-invalid={!!errors.startTime}
          />
          {errors.startTime ? (
            <p className="text-xs font-medium text-destructive">{errors.startTime}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wl-end" className="text-[13px] font-medium text-neutral-700">
            End <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wl-end"
            type="time"
            value={endTimeStr}
            onChange={(event) => handleEndChange(event.target.value)}
            onBlur={handleEndBlur}
            className="font-mono"
            aria-invalid={!!errors.endTime}
          />
          {errors.endTime ? (
            <p className="text-xs font-medium text-destructive">{errors.endTime}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wl-notes" className="text-[13px] font-medium text-neutral-700">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="wl-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional details..."
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" size="lg">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1" size="lg">
          {isPending ? <Spinner /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
