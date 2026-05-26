'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  minChars: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkLogChange: (value: string) => void;
  onConfirm: () => void;
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
  minChars,
  isPending,
  onOpenChange,
  onWorkLogChange,
  onConfirm,
}: Readonly<ClockOutConfirmDialogProps>) {
  const trimmedLength = workLogText.trim().length;
  const charsRemaining = Math.max(0, minChars - trimmedLength);
  const canConfirm = trimmedLength >= minChars && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm clock-out</DialogTitle>
          <DialogDescription>
            Wrap up your day before closing the session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Session started
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatStartLabel(activeClockIn)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Active duration
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                {elapsedDisplay}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="clock-out-work-log" className="text-sm font-semibold text-foreground">
              What did you accomplish today? (Daily Work Log)
            </label>
            <Textarea
              id="clock-out-work-log"
              value={workLogText}
              onChange={(event) => onWorkLogChange(event.target.value)}
              rows={6}
              placeholder="Summarize the work you completed, progress made, and any important outcomes."
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {charsRemaining > 0
                ? `${charsRemaining} more characters required before you can clock out.`
                : `${trimmedLength} characters entered.`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!canConfirm}>
            {isPending ? 'Clocking out...' : 'Confirm Clock-Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
