'use client';

import { type Control, type UseFormRegister, type UseFormSetValue, useWatch } from 'react-hook-form';

import { Switch } from '@/components/ui/switch';
import { EvaluationCategoryList } from '@/modules/candidates/components/EvaluationCategoryList';
import type { CreatePipelineStageInput } from '@/modules/candidates/schema/atsSchemas';

interface StageEvaluationSectionProps {
  control: Control<CreatePipelineStageInput>;
  register: UseFormRegister<CreatePipelineStageInput>;
  setValue: UseFormSetValue<CreatePipelineStageInput>;
}

export function StageEvaluationSection({
  control,
  register,
  setValue,
}: StageEvaluationSectionProps) {
  const sheetEnabled = useWatch({ control, name: 'sheetEnabled' });

  return (
    <section className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">Evaluation configuration</h3>
        <p className="text-xs text-neutral-500">
          Add the marks or feedback fields interviewers must fill before completing this stage.
        </p>
      </div>

      <EvaluationCategoryList control={control} register={register} setValue={setValue} />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900">Google Sheets integration</p>
          <p className="text-xs text-neutral-500">
            Automatically write feedback values to a Google Sheet for this stage.
          </p>
        </div>
        <Switch
          checked={Boolean(sheetEnabled)}
          onCheckedChange={(checked) => {
            setValue('sheetEnabled', checked);
          }}
        />
      </div>
    </section>
  );
}
