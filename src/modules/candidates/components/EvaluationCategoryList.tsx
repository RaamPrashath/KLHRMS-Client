'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { type Control, type UseFormRegister, type UseFormSetValue, useFieldArray } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_130px_32px_32px_32px] items-center gap-2">
            <Input
              {...register(`evaluationCategories.${index}.name`)}
              placeholder="Category name"
              className="h-9"
            />
            <Select
              defaultValue={field.type ?? 'NUMERIC'}
              onValueChange={(value) =>
                setValue(`evaluationCategories.${index}.type`, value as 'NUMERIC' | 'TEXT' | 'CHECKBOX')
              }
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
              onClick={() => move(index, index + 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete category"
              onClick={() => remove(index)}
            >
              <Trash2 className="size-4 text-destructive-text" />
            </Button>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-3 text-xs text-neutral-500">
            No evaluation subcategories yet.
          </div>
        )}
      </div>
    </div>
  );
}
