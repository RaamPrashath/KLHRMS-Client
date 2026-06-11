'use client';

import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { MyInterview } from '@/modules/candidates/types/atsTypes';

function formatDateTime(value: string | null): string {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export function CandidateSlotReviewDialog({
  interview,
  selectedSlotId,
  isSubmitting,
  onSelectedSlotChange,
  onOpenChange,
  onSubmit,
}: {
  readonly interview: MyInterview | null;
  readonly selectedSlotId: string | null;
  readonly isSubmitting: boolean;
  readonly onSelectedSlotChange: (slotId: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: () => void;
}) {
  const candidateSlots = interview?.proposedSlots.filter((slot) => slot.proposedBy === 'CANDIDATE') ?? [];
  const note = candidateSlots.find((slot) => slot.note)?.note ?? null;

  return (
    <Dialog open={interview !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Candidate proposed slots</DialogTitle>
          <DialogDescription>
            Pick one of the candidate&apos;s alternate slots to confirm the interview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {note ? (
            <div className="rounded-lg border border-info-border bg-info-bg px-3 py-2 text-sm text-info-text">
              {note}
            </div>
          ) : null}

          <div className="grid gap-2">
            {candidateSlots.map((slot) => {
              const selected = selectedSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border bg-surface px-4 py-3 text-left transition-colors focus:outline-none focus:ring-[3px] focus:ring-primary/10',
                    selected ? 'border-primary bg-primary-ghost' : 'border-neutral-100 hover:bg-neutral-50',
                  )}
                  onClick={() => onSelectedSlotChange(slot.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-neutral-900">
                      {formatDateTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </span>
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary text-white' : 'border-neutral-200 bg-surface',
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!selectedSlotId || isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirm slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
