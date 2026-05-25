'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

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
  readonly onSubmit: (payload: { scheduledStartAt: string; durationMinutes: number }) => Promise<void>;
}) {
  const initialDuration = useMemo(() => {
    if (!interview?.scheduledStartAt || !interview.scheduledEndAt) return 30;
    const start = new Date(interview.scheduledStartAt).getTime();
    const end = new Date(interview.scheduledEndAt).getTime();
    const minutes = Math.round((end - start) / 60_000);
    return Number.isFinite(minutes) && minutes >= 15 ? minutes : 30;
  }, [interview]);
  const [date, setDate] = useState(() => (interview?.scheduledStartAt ? toDateInput(interview.scheduledStartAt) : ''));
  const [time, setTime] = useState(() => (interview?.scheduledStartAt ? toTimeInput(interview.scheduledStartAt) : ''));
  const [durationMinutes, setDurationMinutes] = useState(initialDuration);

  const candidateName = useMemo(() => {
    if (!interview) return '';
    return `${interview.candidate.firstName} ${interview.candidate.lastName}`.trim();
  }, [interview]);
  const isReschedule = interview?.status === 'SCHEDULED' || interview?.status === 'ONGOING';

  const dueDate = interview?.stageDueDate ? new Date(interview.stageDueDate) : undefined;
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const selectedDateObj = date ? new Date(date + 'T00:00:00') : undefined;
  const isSelectedToday = selectedDateObj && selectedDateObj.getTime() === todayStart.getTime();

  const minTime = isSelectedToday
    ? { hour: new Date().getHours(), minute: new Date().getMinutes() }
    : undefined;

  async function handleSubmit() {
    if (!date || !time) {
      return;
    }
    const scheduledStartAt = toIsoFromDateTime(date, time);
    if (new Date(scheduledStartAt).getTime() < Date.now()) {
      return;
    }
    if (durationMinutes < 15 || durationMinutes > 240) {
      return;
    }
    await onSubmit({ scheduledStartAt, durationMinutes });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,760px)] sm:max-w-[760px] gap-0 rounded-2xl bg-surface p-0 shadow-[var(--shadow-4)]">
        <DialogHeader className="px-8 pt-8 pb-6">
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
          </DialogTitle>
          <DialogDescription>
            Choose the final slot and duration before notifying the candidate.
          </DialogDescription>
          {interview ? (
            <div className="text-sm text-neutral-500">
              {candidateName} - {interview.stageName}
            </div>
          ) : null}
        </DialogHeader>

        <div className="grid gap-8 px-8 pb-8 md:grid-cols-2 md:items-start">
          <div className="grid min-w-0 content-start gap-3">
            <label className="text-sm font-medium text-neutral-700" id="schedule-date-label">
              Date
            </label>
            <Calendar
              className="w-fit p-0"
              mode="single"
              selected={selectedDateObj}
              onSelect={(selected) => {
                if (selected) {
                  setDate(
                    `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`,
                  );
                } else {
                  setDate('');
                }
              }}
              disabled={[
                { before: todayStart },
                ...(dueDate ? [{ after: dueDate } as const] : []),
              ]}
              aria-labelledby="schedule-date-label"
            />
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

          <div className="grid min-w-0 content-start gap-8 md:pt-0.5">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-neutral-700" id="schedule-time-label">
                Time (IST)
              </label>
              <Input
                type="time"
                value={time}
                aria-labelledby="schedule-time-label"
                onChange={(event) => setTime(event.target.value)}
                min={minTime ? `${String(minTime.hour).padStart(2, '0')}:${String(minTime.minute).padStart(2, '0')}` : undefined}
              />
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-medium text-neutral-700" id="schedule-duration-label">
                Duration
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={15}
                  max={240}
                  value={durationMinutes}
                  aria-labelledby="schedule-duration-label"
                  onChange={(event) => setDurationMinutes(Number.parseInt(event.target.value, 10) || 30)}
                />
                <span className="text-sm text-neutral-500">minutes</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-100 px-8 py-4">
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
            disabled={isSubmitting || !date || !time}
            onClick={handleSubmit}
          >
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
