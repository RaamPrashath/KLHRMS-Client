'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface FormFieldEditorValue {
  label: string;
  required: boolean;
  options?: string[];
}

interface FormFieldEditorProps {
  field: {
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  };
  onChange: (value: FormFieldEditorValue) => void;
  readOnly?: boolean;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
};

export function FormFieldEditor({ field, onChange, readOnly = false }: FormFieldEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
          {FIELD_TYPE_LABELS[field.type] ?? field.type}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="sr-only" htmlFor={`field-label-${field.id}`}>Label</Label>
          <Input
            id={`field-label-${field.id}`}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value, required: field.required, options: field.options })}
            placeholder="Field label"
            readOnly={readOnly}
            className={readOnly ? 'border-transparent bg-transparent px-0' : ''}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`field-required-${field.id}`} className="text-xs text-muted-foreground">
            Required
          </Label>
          <Switch
            id={`field-required-${field.id}`}
            checked={field.required}
            onCheckedChange={(checked) => onChange({ label: field.label, required: checked, options: field.options })}
            disabled={readOnly}
          />
        </div>
      </div>

      {field.type === 'dropdown' ? (
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor={`field-options-${field.id}`}>
            Options (one per line)
          </Label>
          <textarea
            id={`field-options-${field.id}`}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            rows={3}
            value={(field.options ?? []).join('\n')}
            onChange={(e) =>
              onChange({
                label: field.label,
                required: field.required,
                options: e.target.value.split('\n').filter(Boolean),
              })
            }
            readOnly={readOnly}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
        </div>
      ) : null}
    </div>
  );
}
