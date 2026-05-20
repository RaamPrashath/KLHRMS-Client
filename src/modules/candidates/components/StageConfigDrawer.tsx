'use client';

import { AlertTriangle, CalendarDays, X } from 'lucide-react';
import { useEffect } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import { StageEvaluationSection } from '@/modules/candidates/components/StageEvaluationSection';
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

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00+05:30`).toISOString();
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return 'Due date';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function getDefaults(jobPostingId: string, afterStageId: string | null, stage?: PipelineStage | null): CreatePipelineStageInput {
  return {
    jobPostingId,
    name: stage?.name ?? '',
    afterStageId,
    stageType: (stage?.stageType as CreatePipelineStageInput['stageType'] | undefined) ?? 'DEFAULT',
    evaluationEnabled: stage?.evaluationEnabled ?? false,
    sheetEnabled: stage?.sheetEnabled ?? false,
    evaluationType: stage?.evaluationType ?? 'NUMERIC',
    evaluationIncludeTotal: stage?.evaluationIncludeTotal ?? true,
    evaluationIncludeAnalysis: stage?.evaluationIncludeAnalysis ?? false,
    dueDate: stage?.dueDate ?? null,
    evaluationCategories: stage?.evaluationCategories.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type ?? 'NUMERIC',
      maxScore: item.maxScore ?? undefined,
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
  const evaluationEnabled = useWatch({ control: form.control, name: 'evaluationEnabled' });
  const showTerminalWarning = stageType === 'HIRED' || stageType === 'REJECTED';
  const calendarDate = dueDate ? new Date(`${toDateInputValue(dueDate)}T12:00:00+05:30`) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-100 bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {stage ? `Configure ${stage.name}` : title}
          </DialogTitle>
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
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input id="stage-name" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="h-9 flex-1 justify-start bg-surface text-left font-normal">
                      <CalendarDays className="size-4" />
                      {formatDateLabel(dueDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={(date) => {
                        form.setValue('dueDate', date ? fromDateInputValue(date.toISOString().slice(0, 10)) : null);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {dueDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-9"
                    aria-label="Clear due date"
                    onClick={() => form.setValue('dueDate', null)}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
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

          {stageType === 'INTERVIEW' ? (
            <div className="space-y-4 rounded-xl border border-neutral-100 bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Enable Evaluation Support</p>
                  <p className="text-xs text-neutral-500">Configure the feedback sheet created for this interview stage.</p>
                </div>
                <Switch
                  checked={Boolean(evaluationEnabled)}
                  onCheckedChange={(checked) => {
                    form.setValue('evaluationEnabled', checked);
                    if (checked && !form.getValues('evaluationType')) {
                      form.setValue('evaluationType', 'NUMERIC');
                    }
                  }}
                />
              </div>
              {evaluationEnabled ? (
                <StageEvaluationSection
                  control={form.control}
                  register={form.register}
                  setValue={form.setValue}
                />
              ) : null}
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
