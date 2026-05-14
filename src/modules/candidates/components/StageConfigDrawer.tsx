'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type { PipelineStage } from '@/modules/candidates/types/atsTypes';

interface StageConfigDrawerProps {
  open: boolean;
  title: string;
  jobPostingId: string;
  afterStageId?: string | null;
  stage?: PipelineStage | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePipelineStageInput) => void;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stage';
}

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00+05:30`).toISOString();
}

function getDefaults(jobPostingId: string, afterStageId: string | null, stage?: PipelineStage | null): CreatePipelineStageInput {
  return {
    jobPostingId,
    name: stage?.name ?? '',
    afterStageId,
    stageType: (stage?.stageType as CreatePipelineStageInput['stageType'] | undefined) ?? 'DEFAULT',
    evaluationEnabled: stage?.evaluationEnabled ?? false,
    dueDate: stage?.dueDate ?? null,
    evaluationCategories: stage?.evaluationCategories.map((item) => ({
      id: item.id,
      name: item.name,
      order: item.order,
    })) ?? [],
  };
}

export function StageConfigDrawer({
  open,
  title,
  jobPostingId,
  afterStageId = null,
  stage = null,
  submitting,
  onOpenChange,
  onSubmit,
}: StageConfigDrawerProps) {
  const form = useForm<CreatePipelineStageInput>({
    defaultValues: getDefaults(jobPostingId, afterStageId, stage),
  });

  useEffect(() => {
    form.reset(getDefaults(jobPostingId, afterStageId, stage));
  }, [afterStageId, form, jobPostingId, stage]);

  const stageType = useWatch({ control: form.control, name: 'stageType' });
  const dueDate = useWatch({ control: form.control, name: 'dueDate' });
  const stageName = useWatch({ control: form.control, name: 'name' });
  const evaluationEnabled = useWatch({ control: form.control, name: 'evaluationEnabled' });
  const slugPreview = useMemo(
    () => stage?.slug ?? slugify(stageName || ''),
    [stage?.slug, stageName],
  );
  const showTerminalWarning = stageType === 'HIRED' || stageType === 'REJECTED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-100 bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">{title}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => {
            const parsed = createPipelineStageSchema.safeParse(values);
            if (!parsed.success) {
              const issue = parsed.error.issues[0];
              if (issue?.path[0] === 'name') {
                form.setError('name', { message: issue.message });
              }
              return;
            }
            onSubmit(parsed.data);
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="stage-name">Stage Name</Label>
            <Input id="stage-name" {...form.register('name')} />
            <p className="text-xs text-neutral-500">Slug: {slugPreview}</p>
            {form.formState.errors.name?.message ? (
              <p className="text-xs text-destructive-text">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label>Stage Type</Label>
            <RadioGroup
              value={stageType}
              onValueChange={(value) => form.setValue('stageType', value as CreatePipelineStageInput['stageType'])}
              className="grid gap-3 sm:grid-cols-2"
            >
              {[
                ['DEFAULT', 'Default'],
                ['INTERVIEW', 'Interview'],
                ['OFFER', 'Offer'],
                ['HIRED', 'Hired'],
                ['REJECTED', 'Rejected'],
              ].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-canvas px-4 py-3 text-sm font-medium text-neutral-900">
                  <RadioGroupItem value={value} id={`stage-type-${value}`} />
                  {label}
                </label>
              ))}
            </RadioGroup>
            {showTerminalWarning ? (
              <div className="rounded-xl border border-warning-bg bg-warning-bg/50 p-3 text-sm text-warning-text">
                <span className="inline-flex items-center gap-2 font-medium"><AlertTriangle className="size-4" />Only one {stageType === 'HIRED' ? 'Hired' : 'Rejected'} stage is recommended.</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-100 bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">Due Date</p>
                <p className="text-xs text-neutral-500">Enable an optional stage due date.</p>
              </div>
              <Switch
                checked={Boolean(dueDate)}
                onCheckedChange={(checked) => form.setValue('dueDate', checked ? fromDateInputValue(new Date().toISOString().slice(0, 10)) : null)}
              />
            </div>
            {dueDate ? (
              <Input
                type="date"
                value={toDateInputValue(dueDate)}
                onChange={(event) => form.setValue('dueDate', fromDateInputValue(event.target.value))}
              />
            ) : null}
          </div>

          {stageType === 'INTERVIEW' ? (
            <div className="space-y-3 rounded-xl border border-neutral-100 bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Enable Evaluation Support</p>
                  <p className="text-xs text-neutral-500">The detailed evaluation configuration stays out of scope for now.</p>
                </div>
                <Switch
                  checked={Boolean(evaluationEnabled)}
                  onCheckedChange={(checked) => form.setValue('evaluationEnabled', checked)}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Stage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
