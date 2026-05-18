'use client';

import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';
import { parseAnnualSalaryInput } from '@/modules/jobs/utils/salaryParser';

interface CompensationSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
}

export function CompensationSection({
  form,
}: Readonly<CompensationSectionProps>) {
  const currency = useWatch({ control: form.control, name: 'currency' });
  const salaryVisibility = useWatch({ control: form.control, name: 'salaryVisibility' });
  const [salaryMinInput, setSalaryMinInput] = useState('');
  const [salaryMaxInput, setSalaryMaxInput] = useState('');
  const [salaryError, setSalaryError] = useState<string | null>(null);

  const updateSalary = (
    field: 'salaryMin' | 'salaryMax',
    value: string,
  ) => {
    const parsed = parseAnnualSalaryInput(value);
    if (!value.trim()) {
      form.setValue(field, null, { shouldDirty: true, shouldValidate: true });
      setSalaryError(null);
      return;
    }
    if (parsed == null) {
      setSalaryError('Use amounts like 4.5 lakhs, 1 crore, or 650000.');
      return;
    }
    form.setValue(field, parsed, { shouldDirty: true, shouldValidate: true });
    setSalaryError(null);
  };

  return (
    <SectionCard id="compensation" title="Compensation">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(value) => form.setValue('currency', value, { shouldDirty: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Salary visibility</Label>
          <Select
            value={salaryVisibility}
            onValueChange={(value) =>
              form.setValue('salaryVisibility', value as CreateJobRequisitionInput['salaryVisibility'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL_ONLY">Internal only</SelectItem>
              <SelectItem value="PUBLIC">Show on careers page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-min">Minimum salary</Label>
          <Input
            id="salary-min"
            inputMode="decimal"
            value={salaryMinInput}
            onChange={(event) => {
              setSalaryMinInput(event.target.value);
              updateSalary('salaryMin', event.target.value);
            }}
            placeholder="e.g. 4.5 lakhs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salary-max">Maximum salary</Label>
          <Input
            id="salary-max"
            inputMode="decimal"
            value={salaryMaxInput}
            onChange={(event) => {
              setSalaryMaxInput(event.target.value);
              updateSalary('salaryMax', event.target.value);
            }}
            placeholder="e.g. 8 lakhs"
          />
        </div>
      </div>

      {salaryError ? (
        <p className="text-xs text-destructive-text">{salaryError}</p>
      ) : null}
      {form.formState.errors.salaryMax ? (
        <p className="text-xs text-destructive-text">{form.formState.errors.salaryMax.message}</p>
      ) : null}
    </SectionCard>
  );
}
