'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CompleteInterviewDialogProps {
  readonly open: boolean;
  readonly candidateName?: string | null;
  /** @deprecated no longer rendered, kept for API compatibility */
  readonly detail?: string | null;
  readonly note: string;
  readonly isSubmitting: boolean;
  readonly onNoteChange: (note: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: () => void | Promise<void>;
}

export function CompleteInterviewDialog({
  open,
  candidateName,
  note,
  isSubmitting,
  onNoteChange,
  onOpenChange,
  onSubmit,
}: CompleteInterviewDialogProps) {
  const canSubmit = note.trim().length > 0 && !isSubmitting;
  const name = candidateName?.trim() || 'Candidate';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-neutral-100 bg-surface p-0 shadow-[0_12px_40px_rgba(0,0,0,0.09)] sm:max-w-[440px]">

        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-neutral-900">
            {name}
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-neutral-500">
            Add a brief outcome note to complete this interview.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="border-t border-neutral-100 px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="completion-note"
              className="text-[13px] font-medium text-neutral-700"
            >
              Completion note
            </label>
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-medium text-warning-text">
              Required
            </span>
          </div>
          <Textarea
            id="completion-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Summarize the outcome, next steps, or key feedback…"
            className="min-h-[120px] resize-none rounded-xl border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/10"
            maxLength={1000}
            disabled={isSubmitting}
          />
          <p className="text-right text-[11px] tabular-nums text-neutral-400">
            {note.length}<span className="text-neutral-300">/1000</span>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-canvas/50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit}
            className="min-w-[140px]"
            onClick={() => { void onSubmit(); }}
          >
            {isSubmitting
              ? <><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Completing…</>
              : 'Complete interview'}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
