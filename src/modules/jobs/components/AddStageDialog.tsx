'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import { PIPELINE_STAGE_TYPES } from '@/modules/jobs/types/jobRequisitionTypes';

const STAGE_TYPE_LABELS: Record<(typeof PIPELINE_STAGE_TYPES)[number], string> = {
  DEFAULT: 'Default',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

interface AddStageDialogProps {
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreatePipelineStageInput) => void;
}

export function AddStageDialog({
  open,
  submitting,
  onOpenChange,
  onSubmit,
}: Readonly<AddStageDialogProps>) {
  const form = useForm<CreatePipelineStageInput>({
    resolver: zodResolver(createPipelineStageSchema),
    defaultValues: {
      name: '',
      stageType: 'DEFAULT',
    },
  });
  const selectedStageType = useWatch({
    control: form.control,
    name: 'stageType',
  });

  useEffect(() => {
    if (!open) {
      form.reset({ name: '', stageType: 'DEFAULT' });
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add pipeline stage</DialogTitle>
          <DialogDescription>
            Create a lightweight stage for this approved requisition.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-neutral-700">Stage name</span>
            <Input
              placeholder="Screening"
              disabled={submitting}
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <span className="mt-1 block text-xs text-destructive-text">
                {form.formState.errors.name.message}
              </span>
            ) : null}
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-neutral-700">Stage type</span>
            <RadioGroup
              value={selectedStageType}
              onValueChange={(value) =>
                form.setValue('stageType', value as CreatePipelineStageInput['stageType'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="grid grid-cols-2 gap-2"
            >
              {PIPELINE_STAGE_TYPES.map((stageType) => (
                <label
                  key={stageType}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-100 bg-surface px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-ghost has-[[data-state=checked]]:text-primary"
                >
                  <RadioGroupItem value={stageType} disabled={submitting} />
                  {STAGE_TYPE_LABELS[stageType]}
                </label>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Save stage
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
