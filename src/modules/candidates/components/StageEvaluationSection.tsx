'use client';

import { type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';

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
  return (
    <section className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">Evaluation configuration</h3>
        <p className="text-xs text-neutral-500">
          Add the marks or feedback fields interviewers must fill before completing this stage.
        </p>
      </div>

      <EvaluationCategoryList control={control} register={register} setValue={setValue} />
    </section>
  );
}
