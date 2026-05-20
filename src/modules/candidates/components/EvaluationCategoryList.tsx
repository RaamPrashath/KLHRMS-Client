'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { type Control, type UseFormRegister, type UseFormSetValue, useFieldArray, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CreatePipelineStageInput } from '@/modules/candidates/schema/atsSchemas';

interface EvaluationCategoryListProps {
  control: Control<CreatePipelineStageInput>;
  register: UseFormRegister<CreatePipelineStageInput>;
  setValue: UseFormSetValue<CreatePipelineStageInput>;
}

export function EvaluationCategoryList({ control, register, setValue }: EvaluationCategoryListProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'evaluationCategories',
  });

  const categories = useWatch({ control, name: 'evaluationCategories' });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-neutral-700">Subcategories</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ name: '', type: 'NUMERIC', order: fields.length + 1 })}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => {
          const currentType = categories?.[index]?.type ?? 'NUMERIC';
          const isNumeric = currentType === 'NUMERIC';

          return (
            <div key={field.id} className={cn(
              'grid items-center gap-2',
              isNumeric
                ? 'grid-cols-[1fr_120px_28px_28px_28px]'
                : 'grid-cols-[1fr_120px_28px_28px_28px]',
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  {...register(`evaluationCategories.${index}.name`)}
                  placeholder="Category name"
                  className="h-9 flex-1 min-w-0"
                />
                {isNumeric ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Total"
                      className="h-9 w-20 text-center"
                      {...register(`evaluationCategories.${index}.maxScore`, {
                        setValueAs: (value) => {
                          if (value === '' || value === undefined || value === null) return undefined;
                          const num = Number(value);
                          return Number.isNaN(num) ? undefined : num;
                        },
                      })}
                    />
                  </div>
                ) : null}
              </div>
              <Select
                value={currentType}
                onValueChange={(value) => {
                  setValue(`evaluationCategories.${index}.type`, value as 'NUMERIC' | 'TEXT' | 'CHECKBOX');
                  if (value !== 'NUMERIC') {
                    setValue(`evaluationCategories.${index}.maxScore`, undefined);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full bg-surface">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMERIC">Numeric</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={index === 0}
                aria-label="Move category up"
                className="size-7"
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={index === fields.length - 1}
                aria-label="Move category down"
                className="size-7"
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Delete category"
                className="size-7"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4 text-destructive-text" />
              </Button>
            </div>
          );
        })}
        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-3 text-xs text-neutral-500">
            No evaluation subcategories yet.
          </div>
        )}
      </div>
    </div>
  );
}
