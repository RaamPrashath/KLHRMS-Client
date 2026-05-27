'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MyInterview } from '@/modules/candidates/types/atsTypes';

function toDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function toTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(11, 16);
}

function toIsoFromDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function fromDateToDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDisplayDate(value: string): string {
  const date = parseDateInput(value);
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface SlotEntry {
  id: string;
  date: string;
  startTime: string;
}

const DEFAULT_DURATION_MINUTES = 30;
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 240;
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

let slotCounter = 0;
function createEmptySlot(date = '', startTime = ''): SlotEntry {
  slotCounter += 1;
  return { id: `slot-${slotCounter}`, date, startTime };
}

function createSlotFromIso(startTime: string): SlotEntry {
  return createEmptySlot(toDateInput(startTime), toTimeInput(startTime));
}

function initialSlotsForInterview(interview: MyInterview | null): SlotEntry[] {
  const proposedSlots = interview?.proposedSlots ?? [];
  if (proposedSlots.length > 0) {
    return proposedSlots
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((slot) => createSlotFromIso(slot.startTime));
  }

  return [
    createEmptySlot(
      interview?.scheduledStartAt ? toDateInput(interview.scheduledStartAt) : '',
      interview?.scheduledStartAt ? toTimeInput(interview.scheduledStartAt) : '',
    ),
  ];
}

function addMinutes(date: string, time: string, minutes: number): string {
  const startsAt = new Date(`${date}T${time}`);
  return new Date(startsAt.getTime() + minutes * 60_000).toISOString();
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map((part) => Number.parseInt(part, 10));
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function normalizeTimeInput(value: string): string | null {
  const trimmed = value.trim();
  const compactMatch = /^(\d{1,2})(\d{2})$/.exec(trimmed);
  const colonMatch = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  const match = colonMatch ?? compactMatch;
  if (!match) return null;

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function DateField({
  value,
  minDate,
  maxDate,
  onChange,
}: {
  readonly value: string;
  readonly minDate: Date;
  readonly maxDate?: Date;
  readonly onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateInput(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full justify-between bg-surface px-3 text-left text-sm font-normal',
            !value && 'text-neutral-400',
          )}
        >
          <span>{formatDisplayDate(value)}</span>
          <CalendarDays className="size-4 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(fromDateToDateInput(date));
            setOpen(false);
          }}
          disabled={[
            { before: minDate },
            ...(maxDate ? [{ after: maxDate } as const] : []),
          ]}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimeField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [selectedHour = '', selectedMinute = ''] = (isValidTime(value) ? value : '').split(':');

  function updateTimePart(part: 'hour' | 'minute', nextValue: string) {
    const hour = part === 'hour' ? nextValue : selectedHour || '00';
    const minute = part === 'minute' ? nextValue : selectedMinute || '00';
    const nextTime = `${hour}:${minute}`;
    setDraftValue(nextTime);
    onChange(nextTime);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex h-10 overflow-hidden rounded-md border border-input bg-surface shadow-xs focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/10">
          <Input
            type="text"
            inputMode="numeric"
            value={draftValue}
            placeholder="HH:MM"
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/[^\d:]/g, '').slice(0, 5);
              setDraftValue(nextValue);
              if (isValidTime(nextValue)) onChange(nextValue);
            }}
            onBlur={() => {
              const normalized = normalizeTimeInput(draftValue);
              if (normalized) {
                setDraftValue(normalized);
                onChange(normalized);
              }
            }}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-full w-10 rounded-none border-l border-neutral-100 text-neutral-500 hover:bg-neutral-50"
              aria-label="Select time"
            >
              <Clock3 className="size-4" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[236px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="grid h-[340px] grid-cols-2 overflow-hidden rounded-md">
          <div className="border-r border-neutral-100">
            <div className="border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">
              Hour
            </div>
            <div className="h-[300px] overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
              <div className="grid p-1">
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={cn(
                      'h-8 rounded-md px-3 text-left font-mono text-sm text-neutral-700 hover:bg-neutral-50',
                      selectedHour === hour && 'bg-primary-ghost text-primary',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => updateTimePart('hour', hour)}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">
              Minute
            </div>
            <div className="h-[300px] overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
              <div className="grid p-1">
                {MINUTES.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={cn(
                      'h-8 rounded-md px-3 text-left font-mono text-sm text-neutral-700 hover:bg-neutral-50',
                      selectedMinute === minute && 'bg-primary-ghost text-primary',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => updateTimePart('minute', minute)}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SchedulingModal({
  interview,
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  readonly interview: MyInterview | null;
  readonly open: boolean;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (payload: {
    proposedSlots: Array<{ startTime: string; endTime: string }>;
    durationMinutes: number;
  }) => Promise<void>;
}) {
  const initialDuration = useMemo(() => {
    const firstProposedSlot = interview?.proposedSlots?.[0];
    const startValue = firstProposedSlot?.startTime ?? interview?.scheduledStartAt;
    const endValue = firstProposedSlot?.endTime ?? interview?.scheduledEndAt;
    if (!startValue || !endValue) return DEFAULT_DURATION_MINUTES;
    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();
    const minutes = Math.round((end - start) / 60_000);
    return Number.isFinite(minutes) && minutes >= MIN_DURATION_MINUTES ? minutes : DEFAULT_DURATION_MINUTES;
  }, [interview]);

  const [slots, setSlots] = useState<SlotEntry[]>(() => initialSlotsForInterview(interview));
  const [durationMinutes, setDurationMinutes] = useState(String(initialDuration));

  const candidateName = useMemo(() => {
    if (!interview) return '';
    return `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();
  }, [interview]);

  const stageDueDate = interview?.stageDueDate;
  const dueDate = useMemo(() => (stageDueDate ? new Date(stageDueDate) : undefined), [stageDueDate]);
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  useEffect(() => {
    if (!open) return;
    setSlots(initialSlotsForInterview(interview));
    setDurationMinutes(String(initialDuration));
  }, [initialDuration, interview, open]);

  const addSlot = useCallback(() => {
    setSlots((prev) => [...prev, createEmptySlot()]);
  }, []);

  const removeSlot = useCallback((id: string) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }, []);

  const updateSlot = useCallback((id: string, field: keyof SlotEntry, value: string) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const resolvedDurationMinutes = durationMinutes.trim()
    ? Number.parseInt(durationMinutes, 10)
    : DEFAULT_DURATION_MINUTES;

  async function handleSubmit() {
    const validSlots = slots.filter((s) => s.date && isValidTime(s.startTime));
    if (validSlots.length === 0) return;

    const proposedSlots = validSlots.map((s) => ({
      startTime: toIsoFromDateTime(s.date, s.startTime),
      endTime: addMinutes(s.date, s.startTime, resolvedDurationMinutes),
    }));

    if (proposedSlots.some((s) => new Date(s.startTime).getTime() < Date.now())) return;
    if (resolvedDurationMinutes < MIN_DURATION_MINUTES || resolvedDurationMinutes > MAX_DURATION_MINUTES) return;
    if (proposedSlots.some((s) => new Date(s.endTime).getTime() <= new Date(s.startTime).getTime())) return;

    await onSubmit({ proposedSlots, durationMinutes: resolvedDurationMinutes });
  }

  const hasCompleteSlot = slots.some((s) => s.date && isValidTime(s.startTime));
  const hasValidDuration =
    durationMinutes.trim() === '' ||
    (Number.isFinite(resolvedDurationMinutes) &&
      resolvedDurationMinutes >= MIN_DURATION_MINUTES &&
      resolvedDurationMinutes <= MAX_DURATION_MINUTES);
  const isReschedule = interview?.status === 'SCHEDULED' || interview?.status === 'COMPLETED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(94vw,680px)] overflow-hidden gap-0 rounded-2xl border border-neutral-100 bg-surface p-0 shadow-[var(--shadow-4)] sm:max-w-[680px]">
        <DialogHeader className="border-b border-neutral-100 bg-canvas/50 px-6 pt-6 pb-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-ghost text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl font-semibold text-neutral-900">
                {isReschedule ? 'Reschedule Interview' : 'Accept Interview'}
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-500">
                Propose time slots for the candidate to choose from.
              </DialogDescription>
              {interview ? (
                <div className="truncate text-sm font-medium text-neutral-700">
                  {candidateName} <span className="font-normal text-neutral-400">/</span> {interview.stageName}
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(88vh-156px)] overflow-y-auto px-6 py-5 sm:px-7">
          <div className="grid min-w-0 content-start gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-neutral-900">
                  Time slots
                </label>
                <p className="text-xs text-neutral-500">IST</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                className="gap-1"
              >
                <Plus className="size-3.5" />
                Add slot
              </Button>
            </div>

            <div className="grid gap-3">
              {slots.map((slot, index) => (
                <div key={slot.id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-canvas/70 p-3 shadow-[var(--shadow-1)]">
                  <div className="grid min-w-0 flex-1 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-500">
                        Slot {index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-500">
                        <Clock3 className="size-3" />
                        {durationMinutes.trim() || DEFAULT_DURATION_MINUTES} min
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr]">
                      <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                        Date
                        <DateField
                          value={slot.date}
                          minDate={todayStart}
                          maxDate={dueDate}
                          onChange={(value) => updateSlot(slot.id, 'date', value)}
                        />
                      </label>
                      <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                        Start time
                        <TimeField
                          value={slot.startTime}
                          onChange={(value) => updateSlot(slot.id, 'startTime', value)}
                        />
                      </label>
                    </div>
                  </div>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="mt-1 shrink-0 text-neutral-400 hover:text-destructive-text transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-surface-subtle/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-medium text-neutral-700">
                Duration <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={MIN_DURATION_MINUTES}
                  max={MAX_DURATION_MINUTES}
                  placeholder={String(DEFAULT_DURATION_MINUTES)}
                  value={durationMinutes}
                  className="h-10 w-24 bg-surface text-sm"
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
                <span className="text-sm text-neutral-500">minutes</span>
              </div>
            </div>
            {dueDate ? (
              <p className="text-xs text-neutral-500">
                Available until{' '}
                {dueDate.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'Asia/Kolkata',
                })}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-100 bg-surface px-6 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover"
            disabled={isSubmitting || !hasCompleteSlot || !hasValidDuration}
            onClick={handleSubmit}
          >
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isReschedule ? 'Reschedule' : 'Send slots to candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
