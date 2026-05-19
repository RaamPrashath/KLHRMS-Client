'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

  async function handleSubmit() {
    if (!date || !time) {
      toast.error('Choose a date and time');
      return;
    }
    const scheduledStartAt = toIsoFromDateTime(date, time);
    if (new Date(scheduledStartAt).getTime() < Date.now()) {
      toast.error('Interview cannot be scheduled in the past');
      return;
    }
    if (durationMinutes < 15 || durationMinutes > 240) {
      toast.error('Duration must be between 15 and 240 minutes');
      return;
    }
    await onSubmit({ scheduledStartAt, durationMinutes });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl bg-surface shadow-[var(--shadow-4)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            Schedule Interview
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

        <div className="grid gap-4">
          <div className="rounded-lg border border-info-border bg-info-bg p-3 text-xs font-medium text-info-text">
            <CalendarDays className="mr-2 inline size-4" />
            Confirm the final interview slot before notifying the candidate.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-[13px] font-medium text-neutral-700">Date</span>
              <Input
                type="date"
                value={date}
                min={toDateInput(new Date().toISOString())}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-[13px] font-medium text-neutral-700">Time</span>
              <Input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium text-neutral-700">Duration</span>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={15}
                max={240}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number.parseInt(event.target.value, 10) || 30)}
              />
              <span className="text-sm text-neutral-500">minutes</span>
            </div>
          </label>
        </div>

        <DialogFooter className="border-t border-neutral-100 pt-4">
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
            disabled={isSubmitting}
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
