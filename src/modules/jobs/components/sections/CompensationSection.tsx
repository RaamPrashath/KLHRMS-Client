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
import {
  formatInrSalary,
  parseAnnualSalaryInput,
} from '@/modules/jobs/utils/salaryParser';

interface CompensationSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
}

export function CompensationSection({
  form,
}: Readonly<CompensationSectionProps>) {
  const currency = useWatch({ control: form.control, name: 'currency' });
  const salaryVisibility = useWatch({ control: form.control, name: 'salaryVisibility' });
  const salaryMin = useWatch({ control: form.control, name: 'salaryMin' });
  const salaryMax = useWatch({ control: form.control, name: 'salaryMax' });
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
      setSalaryError('Use amounts like 4.5 l, 8 lakhs, 1 crore, or 650000.');
      return;
    }
    form.setValue(field, parsed, { shouldDirty: true, shouldValidate: true });
    setSalaryError(null);
  };

  return (
    <SectionCard title="Compensation" description="Salary can stay internal while the request is being reviewed.">
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
            placeholder="4.5 l"
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
            placeholder="8 LPA"
          />
        </div>
      </div>

      {salaryError ? (
        <p className="text-xs text-destructive-text">{salaryError}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          Indian notation is supported. Parsed range:{' '}
          <span className="font-mono text-neutral-700">
            {salaryMin != null ? `${currency} ${formatInrSalary(salaryMin)}` : 'Not set'}
            {salaryMax != null ? ` - ${formatInrSalary(salaryMax)}` : ''}
          </span>
        </p>
      )}
      {form.formState.errors.salaryMax ? (
        <p className="text-xs text-destructive-text">{form.formState.errors.salaryMax.message}</p>
      ) : null}
    </SectionCard>
  );
}
