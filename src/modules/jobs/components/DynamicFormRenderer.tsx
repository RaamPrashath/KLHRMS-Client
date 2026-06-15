'use client';

import type { FieldError } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError as FieldErrorUI, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface DynamicFormField {
  id: string;
  type: 'short_text' | 'long_text' | 'dropdown' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

interface DynamicFormRendererProps {
  fields: DynamicFormField[];
  values: Record<string, unknown>;
  errors: Record<string, FieldError | undefined>;
  onFieldChange: (id: string, value: unknown) => void;
}

export function DynamicFormRenderer({
  fields,
  values,
  errors,
  onFieldChange,
}: DynamicFormRendererProps) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <Field key={field.id}>
          <FieldLabel htmlFor={`custom-${field.id}`}>
            {field.label}
            {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
          </FieldLabel>

          {field.type === 'short_text' ? (
            <Input
              id={`custom-${field.id}`}
              value={(values[field.id] as string) ?? ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
            />
          ) : null}

          {field.type === 'long_text' ? (
            <Textarea
              id={`custom-${field.id}`}
              value={(values[field.id] as string) ?? ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
            />
          ) : null}

          {field.type === 'dropdown' ? (
            <Select
              value={(values[field.id] as string) ?? ''}
              onValueChange={(v) => onFieldChange(field.id, v)}
            >
              <SelectTrigger id={`custom-${field.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {field.type === 'checkbox' ? (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id={`custom-${field.id}`}
                checked={(values[field.id] as boolean) ?? false}
                onCheckedChange={(checked) => onFieldChange(field.id, checked === true)}
              />
              <label
                htmlFor={`custom-${field.id}`}
                className="text-sm text-muted-foreground"
              >
                {field.label}
              </label>
            </div>
          ) : null}

          {field.type === 'date' ? (
            <Input
              id={`custom-${field.id}`}
              type="date"
              value={(values[field.id] as string) ?? ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
            />
          ) : null}

          {errors[field.id] ? (
            <FieldErrorUI errors={[errors[field.id]]} />
          ) : null}
        </Field>
      ))}
    </div>
  );
}
