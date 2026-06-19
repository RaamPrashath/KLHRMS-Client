'use client';

import { useState } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormFieldValue } from '@/modules/jobs/components/FormBuilderSection';

function generateId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: FormFieldValue) => void;
}

const FIELD_TYPES = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
] as const;

export function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  const [type, setType] = useState<string>('short_text');
  const [label, setLabel] = useState('');

  function handleAdd() {
    if (!label.trim()) return;
    onAdd({
      id: generateId(),
      type: type as FormFieldValue['type'],
      label: label.trim(),
      required: false,
    });
    setLabel('');
    setType('short_text');
    onOpenChange(false);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setLabel('');
      setType('short_text');
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-field-type">Field Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="add-field-type" className="w-full">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-field-label">Field Label</Label>
            <Input
              id="add-field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Current Employer"
              autoFocus
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAdd} disabled={!label.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
