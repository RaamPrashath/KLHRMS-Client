'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';

interface StageFormDialogProps {
  open: boolean;
  title: string;
  defaultName?: string;
  jobPostingId: string;
  afterStageId?: string | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePipelineStageInput) => void;
}

export function StageFormDialog({
  open,
  title,
  defaultName = '',
  jobPostingId,
  afterStageId = null,
  submitting,
  onOpenChange,
  onSubmit,
}: StageFormDialogProps) {
  const form = useForm<CreatePipelineStageInput>({
    resolver: zodResolver(createPipelineStageSchema),
    defaultValues: {
      jobPostingId,
      name: defaultName,
      afterStageId,
    },
  });

  useEffect(() => {
    form.reset({ jobPostingId, name: defaultName, afterStageId });
  }, [afterStageId, defaultName, form, jobPostingId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input id="stage-name" {...form.register('name')} />
            {form.formState.errors.name?.message && (
              <p className="text-xs text-destructive-text">{form.formState.errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
