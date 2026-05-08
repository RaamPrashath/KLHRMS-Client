'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';

interface RequisitionDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actionLabel: 'Approve' | 'Reject';
  loading: boolean;
  onConfirm: (comment: string) => Promise<void>;
}

export function RequisitionDecisionDialog({
  open,
  onOpenChange,
  title,
  actionLabel,
  loading,
  onConfirm,
}: Readonly<RequisitionDecisionDialogProps>) {
  const [comment, setComment] = useState('');

  async function handleConfirm() {
    try {
      await onConfirm(comment);
      setComment('');
      onOpenChange(false);
    } catch (error) {
      let message = `Failed to ${actionLabel.toLowerCase()} requisition`;
      try {
        const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
        if (parsed.message) message = parsed.message;
      } catch {
        // ignore parse errors
      }
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface">
        <DialogHeader>
          <DialogTitle>{actionLabel} Requisition</DialogTitle>
          <DialogDescription>
            Add an optional comment for <span className="font-medium text-neutral-900">{title}</span>.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={4}
          placeholder="Optional comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={actionLabel === 'Reject' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
          >
            {loading ? `${actionLabel}ing...` : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
