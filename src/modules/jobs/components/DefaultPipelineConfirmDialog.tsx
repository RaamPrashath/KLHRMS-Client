'use client';

import { Layers, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DefaultPipelineConfirmDialogProps {
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DefaultPipelineConfirmDialog({
  open,
  loading,
  onOpenChange,
  onConfirm,
}: Readonly<DefaultPipelineConfirmDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-ghost text-primary">
            <Layers className="size-5" />
          </div>
        <DialogTitle>Use default pipeline?</DialogTitle>
        <DialogDescription>
            This will create 5 stages: Screening, Interview, Offer, Document collection, and Rejected.
        </DialogDescription>
      </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={loading} onClick={onConfirm}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Use default pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
