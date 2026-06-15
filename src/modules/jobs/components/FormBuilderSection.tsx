'use client';

import { Eye, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AddFieldDialog } from '@/modules/jobs/components/AddFieldDialog';

const FIELD_TYPE_LABELS: Record<FormFieldValue['type'], string> = {
  short_text: 'Text',
  long_text: 'Paragraph',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
};

function FieldEditorInline({
  field,
  onChange,
  readOnly,
  onRemove,
}: {
  field: FormFieldValue;
  onChange: (updated: Partial<FormFieldValue>) => void;
  readOnly: boolean;
  onRemove?: () => void;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        <span className="truncate text-sm font-medium">{field.label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!readOnly ? (
          <>
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onChange({ required: checked })}
                className="size-3.5 scale-[0.65]"
              />
              Req
            </label>
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {field.required ? 'Required' : 'Optional'}
          </span>
        )}
      </div>
    </>
  );
}

export interface FormFieldValue {
  id: string;
  type: 'short_text' | 'long_text' | 'dropdown' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

interface FormBuilderSectionProps {
  fields: FormFieldValue[];
  onChange: (fields: FormFieldValue[]) => void;
  readOnly?: boolean;
}

function FormPreviewDialog({
  open,
  onOpenChange,
  fields,
  defaultFields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FormFieldValue[];
  defaultFields: { label: string; required: boolean }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Application Form Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            This is how candidates will see the application form.
          </p>

          <div className="space-y-4">
            {defaultFields.map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {f.label}
                  {f.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                </label>
                {f.label === 'Resume' ? (
                  <Input disabled type="file" accept=".pdf,.doc,.docx" />
                ) : f.label === 'Phone' ? (
                  <Input disabled value="" placeholder="Enter phone number" />
                ) : (
                  <Input disabled value="" placeholder={`Enter ${f.label.toLowerCase()}`} />
                )}
              </div>
            ))}
          </div>

          {fields.length > 0 ? (
            <>
              <hr />
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                    </label>
                    {field.type === 'short_text' ? (
                      <Input disabled value="" placeholder={`Enter ${field.label.toLowerCase()}`} />
                    ) : null}
                    {field.type === 'long_text' ? (
                      <Textarea disabled value="" placeholder={`Enter ${field.label.toLowerCase()}`} />
                    ) : null}
                    {field.type === 'dropdown' ? (
                      <Select disabled>
                        <SelectTrigger>
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
                        <Checkbox id={`preview-${field.id}`} disabled />
                        <label htmlFor={`preview-${field.id}`} className="text-sm text-muted-foreground">
                          {field.label}
                        </label>
                      </div>
                    ) : null}
                    {field.type === 'date' ? (
                      <Input disabled type="date" value="" />
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_FIELDS = [
  { label: 'First Name', required: true },
  { label: 'Last Name', required: true },
  { label: 'Email', required: true },
  { label: 'Phone', required: false },
  { label: 'Resume', required: true },
];

export function FormBuilderSection({
  fields,
  onChange,
  readOnly = false,
}: FormBuilderSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleAdd(field: FormFieldValue) {
    onChange([...fields, field]);
  }

  function handleRemove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function handleUpdate(id: string, updated: Partial<FormFieldValue>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updated } : f)));
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Application Form Fields</CardTitle>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-1.5 size-3.5" />
                Preview
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                Add Field
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1.5 size-3.5" />
              Preview
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Default fields (always present): First Name, Last Name, Email, Phone, Resume
          </div>

          {fields.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No custom fields configured.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="group flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <FieldEditorInline
                    field={field}
                    onChange={(updated) => handleUpdate(field.id, updated)}
                    readOnly={readOnly}
                    onRemove={!readOnly ? () => handleRemove(field.id) : undefined}
                  />
                </div>
              ))}
            </div>
          )}

          <AddFieldDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onAdd={handleAdd}
          />
        </CardContent>
      </Card>

      <FormPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fields={fields}
        defaultFields={DEFAULT_FIELDS}
      />
    </>
  );
}
