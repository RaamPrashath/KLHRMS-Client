'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { StageCapabilitySection } from '@/modules/candidates/components/StageCapabilitySection';
import { StageEvaluationSection } from '@/modules/candidates/components/StageEvaluationSection';
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

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toISOString();
}

function getDefaultValues(
  jobPostingId: string,
  afterStageId: string | null,
  stage?: PipelineStage | null,
): CreatePipelineStageInput {
  return {
    jobPostingId,
    name: stage?.name ?? '',
    afterStageId,
    meetingEnabled: stage?.meetingEnabled ?? false,
    offerLetterEnabled: stage?.offerLetterEnabled ?? false,
    evaluationEnabled: stage?.evaluationEnabled ?? false,
    evaluationType: stage?.evaluationType ?? 'NUMERIC',
    evaluationIncludeTotal: stage?.evaluationIncludeTotal ?? false,
    evaluationIncludeAnalysis: stage?.evaluationIncludeAnalysis ?? false,
    dueDate: stage?.dueDate ?? null,
    extendToNextWorkingDay: stage?.extendToNextWorkingDay ?? false,
    evaluationCategories:
      stage?.evaluationCategories.map((category) => ({
        id: category.id,
        name: category.name,
        order: category.order,
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
    defaultValues: getDefaultValues(jobPostingId, afterStageId, stage),
  });

  const dueDate = useWatch({ control: form.control, name: 'dueDate' });
  const meetingEnabled = useWatch({ control: form.control, name: 'meetingEnabled' });
  const evaluationEnabled = useWatch({ control: form.control, name: 'evaluationEnabled' });
  const offerLetterEnabled = useWatch({ control: form.control, name: 'offerLetterEnabled' });
  const evaluationType = useWatch({ control: form.control, name: 'evaluationType' });
  const evaluationIncludeTotal = useWatch({ control: form.control, name: 'evaluationIncludeTotal' });
  const evaluationIncludeAnalysis = useWatch({ control: form.control, name: 'evaluationIncludeAnalysis' });
  useEffect(() => {
    form.reset(getDefaultValues(jobPostingId, afterStageId, stage));
  }, [afterStageId, form, jobPostingId, open, stage]);

  function setDueDateEnabled(enabled: boolean) {
    if (!enabled) {
      form.setValue('dueDate', null, { shouldDirty: true, shouldValidate: true });
      form.setValue('extendToNextWorkingDay', false, { shouldDirty: true });
      form.setValue('meetingEnabled', false, { shouldDirty: true });
      return;
    }
    form.setValue('dueDate', fromDateInputValue(new Date().toISOString().slice(0, 10)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function setMeetingEnabled(enabled: boolean) {
    form.setValue('meetingEnabled', enabled, { shouldDirty: true, shouldValidate: true });
    if (enabled && !form.getValues('dueDate')) {
      setDueDateEnabled(true);
    }
  }

  function setEvaluationEnabled(enabled: boolean) {
    form.setValue('evaluationEnabled', enabled, { shouldDirty: true, shouldValidate: true });
    if (!enabled) {
      form.setValue('evaluationType', null, { shouldDirty: true });
      form.setValue('evaluationIncludeTotal', false, { shouldDirty: true });
      form.setValue('evaluationIncludeAnalysis', false, { shouldDirty: true });
      form.setValue('evaluationCategories', [], { shouldDirty: true });
      return;
    }
    form.setValue('evaluationType', form.getValues('evaluationType') ?? 'NUMERIC', { shouldDirty: true });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-neutral-100 p-5">
          <SheetTitle className="text-xl font-semibold text-neutral-900">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Configure stage settings, evaluation options, and scheduling.
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-5 p-5"
          onSubmit={form.handleSubmit((values) => {
            const parsed = createPipelineStageSchema.safeParse(values);
            if (!parsed.success) {
              const firstIssue = parsed.error.issues[0];
              if (firstIssue?.path[0] === 'dueDate') {
                form.setError('dueDate', { message: firstIssue.message });
              }
              if (firstIssue?.path[0] === 'name') {
                form.setError('name', { message: firstIssue.message });
              }
              return;
            }
            onSubmit({
              ...values,
              evaluationCategories: values.evaluationCategories.map((category, index) => ({
                ...category,
                order: index + 1,
              })),
            });
          })}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Basic information</h3>
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage name</Label>
              <Input id="stage-name" {...form.register('name')} />
              {form.formState.errors.name?.message && (
                <p className="text-xs text-destructive-text">{form.formState.errors.name.message}</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Scheduling</h3>
            <div className="rounded-lg border border-neutral-100 bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-neutral-500" />
                  <Label htmlFor="stage-due-date-enabled" className="text-sm font-medium text-neutral-900">
                    Due date
                  </Label>
                </div>
                <Switch
                  id="stage-due-date-enabled"
                  checked={Boolean(dueDate)}
                  onCheckedChange={setDueDateEnabled}
                />
              </div>
              {dueDate ? (
                <div className="mt-3">
                  <Input
                    type="date"
                    value={toDateInputValue(dueDate)}
                    onChange={(event) =>
                      form.setValue('dueDate', fromDateInputValue(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                  {form.formState.errors.dueDate?.message && (
                    <p className="mt-1 text-xs text-destructive-text">
                      {form.formState.errors.dueDate.message}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Phase 1 pause: keeping extension support out of the drawer for now.
            <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface p-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-neutral-500" />
                <Label htmlFor="stage-extend" className="text-sm font-medium text-neutral-900">
                  Extend to next working day
                </Label>
              </div>
              <Switch
                id="stage-extend"
                checked={extendToNextWorkingDay}
                disabled={!dueDate}
                onCheckedChange={(value) =>
                  form.setValue('extendToNextWorkingDay', value, { shouldDirty: true })
                }
              />
            </div>

            {stage?.id && dueDate && extendToNextWorkingDay && onExtend ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={extending}
                onClick={() => onExtend(stage.id)}
              >
                <RotateCcw className="size-4" />
                Extend now
              </Button>
            ) : null}
            */}
          </section>

          <StageCapabilitySection
            meetingEnabled={meetingEnabled}
            offerLetterEnabled={offerLetterEnabled}
            evaluationEnabled={evaluationEnabled}
            onMeetingChange={setMeetingEnabled}
            onOfferLetterChange={(value) =>
              form.setValue('offerLetterEnabled', value, { shouldDirty: true })
            }
            onEvaluationChange={setEvaluationEnabled}
          />

          {evaluationEnabled ? (
            <StageEvaluationSection
              control={form.control}
              register={form.register}
              evaluationType={evaluationType}
              includeTotal={evaluationIncludeTotal}
              includeAnalysis={evaluationIncludeAnalysis}
              onTypeChange={(value) => {
                form.setValue('evaluationType', value, { shouldDirty: true, shouldValidate: true });
                if (value !== 'NUMERIC') {
                  form.setValue('evaluationIncludeTotal', false, { shouldDirty: true });
                }
              }}
              onIncludeTotalChange={(value) =>
                form.setValue('evaluationIncludeTotal', value, { shouldDirty: true })
              }
              onIncludeAnalysisChange={(value) =>
                form.setValue('evaluationIncludeAnalysis', value, { shouldDirty: true })
              }
            />
          ) : null}

          <SheetFooter className="border-t border-neutral-100 p-0 pt-4">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                Save stage
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
