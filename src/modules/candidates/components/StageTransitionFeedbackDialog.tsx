'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface StageTransitionFeedbackDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly candidateName: string;
  readonly fromStageName: string;
  readonly toStageName: string;
  readonly onSubmit: (data: {
    note: string;
    recommendation: 'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'NO_HIRE' | null;
  }) => void;
  readonly isSubmitting?: boolean;
}

export function StageTransitionFeedbackDialog({
  open,
  onOpenChange,
  candidateName,
  fromStageName,
  toStageName,
  onSubmit,
  isSubmitting = false,
}: StageTransitionFeedbackDialogProps) {
  const [note, setNote] = useState('');
  const [recommendation, setRecommendation] = useState<'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'NO_HIRE' | ''>('');
  const [errors, setErrors] = useState<{ note?: string }>({});

  function resetForm() {
    setNote('');
    setRecommendation('');
    setErrors({});
  }

  function handleClose(open: boolean) {
    if (!open) {
      resetForm();
      onOpenChange(false);
    }
  }

  function handleSubmit() {
    const newErrors: { note?: string } = {};
    if (!note.trim()) {
      newErrors.note = 'Notes are required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit({
      note: note.trim(),
      recommendation: recommendation || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Stage Transition Notes</DialogTitle>
          <DialogDescription>
            Moving <span className="font-semibold text-neutral-900">{candidateName}</span> from{' '}
            <span className="font-medium text-neutral-700">{fromStageName}</span> to{' '}
            <span className="font-medium text-neutral-700">{toStageName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Notes <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Notes about this stage transition..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errors.note) setErrors((prev) => ({ ...prev, note: undefined }));
              }}
              className={cn('min-h-28 resize-y', errors.note && 'border-destructive')}
            />
            {errors.note ? (
              <p className="text-xs text-destructive">{errors.note}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Spinner className="mr-2 size-4" /> Submitting...</> : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
