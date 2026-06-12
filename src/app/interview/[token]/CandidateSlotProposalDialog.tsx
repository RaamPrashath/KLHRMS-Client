'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
function createEmptySlot(): SlotEntry {
  slotCounter += 1;
  return { id: `candidate-slot-${slotCounter}`, date: '', startTime: '' };
}

function toIsoFromDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function addMinutes(date: string, time: string, minutes: number): string {
  const startsAt = new Date(`${date}T${time}`);
  return new Date(startsAt.getTime() + minutes * 60_000).toISOString();
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

export function CandidateSlotProposalDialog({
  open,
  isSubmitting,
  serverError,
  stageDueDate,
  candidateName,
  jobTitle,
  interviewerName,
  onOpenChange,
  onSubmit,
}: {
  readonly open: boolean;
  readonly isSubmitting: boolean;
  readonly serverError: string | null;
  readonly stageDueDate: string | null | undefined;
  readonly candidateName: string | undefined;
  readonly jobTitle: string | undefined;
  readonly interviewerName: string | undefined;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (payload: {
    proposedSlots: Array<{ startTime: string; endTime: string }>;
    durationMinutes: number;
    note: string | null;
  }) => Promise<void>;
}) {
  const [slots, setSlots] = useState<SlotEntry[]>(() => [createEmptySlot()]);
  const [durationMinutes, setDurationMinutes] = useState(String(DEFAULT_DURATION_MINUTES));
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const dueDate = useMemo(() => (stageDueDate ? new Date(stageDueDate) : undefined), [stageDueDate]);
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const resetForm = useCallback(() => {
    setSlots([createEmptySlot()]);
    setDurationMinutes(String(DEFAULT_DURATION_MINUTES));
    setNote('');
    setValidationError(null);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }, [onOpenChange, resetForm]);

  const addSlot = useCallback(() => {
    setSlots((prev) => [...prev, createEmptySlot()]);
  }, []);

  const removeSlot = useCallback((id: string) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((slot) => slot.id !== id) : prev));
  }, []);

  const updateSlot = useCallback((id: string, field: keyof SlotEntry, value: string) => {
    setSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)));
  }, []);

  const resolvedDurationMinutes = durationMinutes.trim()
    ? Number.parseInt(durationMinutes, 10)
    : DEFAULT_DURATION_MINUTES;
  const hasCompleteSlot = slots.some((slot) => slot.date && isValidTime(slot.startTime));
  const hasValidDuration =
    durationMinutes.trim() === '' ||
    (Number.isFinite(resolvedDurationMinutes) &&
      resolvedDurationMinutes >= MIN_DURATION_MINUTES &&
      resolvedDurationMinutes <= MAX_DURATION_MINUTES);
  const displayedError = validationError ?? serverError;

  async function handleSubmit() {
    const validSlots = slots.filter((slot) => slot.date && isValidTime(slot.startTime));
    if (validSlots.length === 0) {
      setValidationError('Please fill in at least one time slot with a date and time');
      return;
    }
    if (!hasValidDuration) {
      setValidationError(`Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`);
      return;
    }

    const proposedSlots = validSlots.map((slot) => ({
      startTime: toIsoFromDateTime(slot.date, slot.startTime),
      endTime: addMinutes(slot.date, slot.startTime, resolvedDurationMinutes),
    }));

    if (proposedSlots.some((slot) => new Date(slot.startTime).getTime() < Date.now())) {
      setValidationError('Selected time is in the past. Please choose a future time slot.');
      return;
    }
    if (proposedSlots.some((slot) => new Date(slot.endTime).getTime() <= new Date(slot.startTime).getTime())) {
      setValidationError('End time must be after start time');
      return;
    }

    setValidationError(null);
    try {
      await onSubmit({
        proposedSlots,
        durationMinutes: resolvedDurationMinutes,
        note: note.trim() || null,
      });
      resetForm();
    } catch {
      // The parent owns the server error message shown in this dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(94vw,680px)] overflow-hidden gap-0 rounded-2xl border border-neutral-100 bg-surface p-0 shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:max-w-[680px]">
        <DialogHeader className="border-b border-neutral-100 bg-canvas/50 px-6 pt-6 pb-5 sm:px-7">
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-xl font-semibold text-neutral-900">
              Propose your own slots
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Share a few times that work better for your schedule.
            </DialogDescription>
            <div className="truncate text-sm font-medium text-neutral-700">
              {candidateName || 'Candidate'}
              <span className="font-normal text-neutral-400"> / </span>
              {jobTitle || 'Interview'}
              {interviewerName ? (
                <>
                  <span className="font-normal text-neutral-400"> / </span>
                  {interviewerName}
                </>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(88vh-156px)] overflow-y-auto bg-canvas/30 px-6 py-5 sm:px-7 no-scrollbar">
          <div className="grid min-w-0 content-start gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-neutral-900">
                  Time slots
                </label>
                <p className="text-xs text-neutral-400">IST</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                className="gap-1 active:scale-[0.97] transition-transform duration-100"
              >
                <Plus className="size-3.5" />
                Add slot
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {slots.map((slot, index) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, height: 0, scale: 0.96, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, height: 'auto', scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, height: 0, scale: 0.96, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="my-1 flex items-center gap-3 rounded-xl border border-neutral-50/50 bg-surface p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                      <span className="shrink-0 rounded-lg bg-neutral-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-neutral-500">
                        Slot {index + 1}
                      </span>
                      <div className="min-w-[140px] flex-1">
                        <DateField
                          value={slot.date}
                          minDate={todayStart}
                          maxDate={dueDate}
                          onChange={(value) => updateSlot(slot.id, 'date', value)}
                        />
                      </div>
                      <div className="w-[120px] shrink-0">
                        <TimeField
                          value={slot.startTime}
                          onChange={(value) => updateSlot(slot.id, 'startTime', value)}
                        />
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-50 px-2.5 py-1.5 font-mono text-xs font-medium text-neutral-500">
                        <Clock3 className="size-3.5" />
                        {durationMinutes.trim() || DEFAULT_DURATION_MINUTES}m
                      </span>
                      {slots.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(slot.id)}
                          className="size-9 shrink-0 rounded-lg text-neutral-400 transition-all hover:bg-destructive-bg/10 hover:text-destructive-text active:scale-95"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-neutral-50/50 bg-surface p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:flex-row sm:items-center sm:justify-between">
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
                  className="h-10 w-24 bg-surface font-mono text-sm"
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
                <span className="text-sm font-medium text-neutral-500">minutes</span>
              </div>
            </div>

            <div className="grid gap-2 bg-transparent p-0">
              <label className="text-sm font-medium text-neutral-700" htmlFor="candidate-slot-note">
                Description <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <Textarea
                id="candidate-slot-note"
                value={note}
                maxLength={1000}
                rows={4}
                placeholder="Add anything the interviewer should know about your availability."
                className="resize-none bg-surface text-sm"
                onChange={(event) => setNote(event.target.value)}
              />
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
            {displayedError ? (
              <p className="rounded-lg border border-destructive-border bg-destructive-bg px-3 py-2 text-sm text-destructive-text">
                {displayedError}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-100 bg-surface px-6 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
            className="active:scale-[0.97] transition-transform duration-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover active:scale-[0.97] transition-transform duration-100"
            disabled={isSubmitting || !hasCompleteSlot || !hasValidDuration}
            onClick={handleSubmit}
          >
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send proposed slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
