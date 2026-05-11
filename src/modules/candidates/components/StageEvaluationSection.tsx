'use client';

import { type Control, type UseFormRegister } from 'react-hook-form';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { EvaluationCategoryList } from '@/modules/candidates/components/EvaluationCategoryList';
import type { CreatePipelineStageInput } from '@/modules/candidates/schema/atsSchemas';

interface StageEvaluationSectionProps {
  control: Control<CreatePipelineStageInput>;
  register: UseFormRegister<CreatePipelineStageInput>;
  evaluationType: 'NUMERIC' | 'TEXT' | 'CHECKBOX' | null | undefined;
  includeTotal: boolean;
  includeAnalysis: boolean;
  onTypeChange: (value: 'NUMERIC' | 'TEXT' | 'CHECKBOX') => void;
  onIncludeTotalChange: (value: boolean) => void;
  onIncludeAnalysisChange: (value: boolean) => void;
}

export function StageEvaluationSection({
  control,
  register,
  evaluationType,
  includeTotal,
  includeAnalysis,
  onTypeChange,
  onIncludeTotalChange,
  onIncludeAnalysisChange,
}: StageEvaluationSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900">Evaluation configuration</h3>
        <RadioGroup
          value={evaluationType ?? 'NUMERIC'}
          onValueChange={(value) => onTypeChange(value as 'NUMERIC' | 'TEXT' | 'CHECKBOX')}
          className="grid grid-cols-3 gap-2"
        >
          <label
            htmlFor="stage-evaluation-type-numeric"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 bg-surface p-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <RadioGroupItem value="NUMERIC" id="stage-evaluation-type-numeric" />
            Numeric
          </label>
          <label
            htmlFor="stage-evaluation-type-text"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 bg-surface p-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <RadioGroupItem value="TEXT" id="stage-evaluation-type-text" />
            Text notes
          </label>
          <label
            htmlFor="stage-evaluation-type-checkbox"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 bg-surface p-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <RadioGroupItem value="CHECKBOX" id="stage-evaluation-type-checkbox" />
            Checkbox
          </label>
        </RadioGroup>
      </div>

      <EvaluationCategoryList control={control} register={register} />

      <div className="space-y-2">
        {evaluationType === 'NUMERIC' ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface p-3">
            <div
              className="flex-1 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => onIncludeTotalChange(!includeTotal)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onIncludeTotalChange(!includeTotal);
                }
              }}
            >
              <p className="text-sm font-medium text-neutral-900">Include total column</p>
            </div>
            <Switch
              id="stage-evaluation-total"
              checked={includeTotal}
              onCheckedChange={onIncludeTotalChange}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface p-3">
          <div
            className="flex-1 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onIncludeAnalysisChange(!includeAnalysis)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onIncludeAnalysisChange(!includeAnalysis);
              }
            }}
          >
            <p className="text-sm font-medium text-neutral-900">Include analysis page</p>
          </div>
          <Switch
            id="stage-evaluation-analysis"
            checked={includeAnalysis}
            onCheckedChange={onIncludeAnalysisChange}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
    </section>
  );
}
