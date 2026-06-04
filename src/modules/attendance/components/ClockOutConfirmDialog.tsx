'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ClockOutConfirmDialogProps {
  open: boolean;
  activeClockIn: string | null;
  elapsedDisplay: string;
  workLogText: string;
  existingWorkSummary?: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkLogChange: (value: string) => void;
  onConfirm: () => void;
  error?: string | null;
}

function formatStartLabel(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ClockOutConfirmDialog({
  open,
  activeClockIn,
  elapsedDisplay,
  workLogText,
  existingWorkSummary = null,
  isPending,
  onOpenChange,
  onWorkLogChange,
  onConfirm,
  error,
}: Readonly<ClockOutConfirmDialogProps>) {
  const shouldAskForWorkSummary = !existingWorkSummary?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-center">Confirm clock-out</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-hairline bg-canvas/30 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-muted-48">
                Session started
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink">
                {formatStartLabel(activeClockIn)}
              </p>
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-muted-48">
                Active duration
              </p>
              <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-ink">
                {elapsedDisplay}
              </p>
            </div>
          </div>

          {shouldAskForWorkSummary ? (
            <div>
              <label htmlFor="clock-out-work-log" className="text-[14px] font-medium block mb-2">
                Work summary
              </label>
              <Textarea
                id="clock-out-work-log"
                value={workLogText}
                onChange={(event) => onWorkLogChange(event.target.value)}
                rows={3}
                placeholder="Add your work summary for today"
                className="resize-none border-hairline bg-canvas/30 text-sm text-ink placeholder:text-ink-muted-48/50"
              />
              {error ? (
                <p className="mt-1.5 text-sm text-destructive-text" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-hairline bg-canvas/30 p-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-muted-48">
                Work summary
              </p>
              <p className="mt-1.5 text-sm text-ink">
                {existingWorkSummary}
              </p>
              {error ? (
                <p className="mt-2 text-sm text-destructive-text" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Clocking out...' : 'Confirm Clock-Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
