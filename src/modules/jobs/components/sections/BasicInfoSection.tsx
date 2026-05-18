'use client';

import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type { JobDepartmentOption } from '@/modules/jobs/types/jobRequisitionTypes';
import { RequiredMark, SectionCard } from '@/modules/jobs/components/sections/SectionCard';

interface BasicInfoSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
  departments: JobDepartmentOption[];
}

export function BasicInfoSection({
  form,
  departments,
}: Readonly<BasicInfoSectionProps>) {
  const [targetDateOpen, setTargetDateOpen] = useState(false);
  const departmentId = useWatch({ control: form.control, name: 'departmentId' });
  const employmentType = useWatch({ control: form.control, name: 'employmentType' });
  const isRemote = useWatch({ control: form.control, name: 'isRemote' });
  const targetDate = useWatch({ control: form.control, name: 'targetDate' });
  const { errors } = form.formState;

  return (
    <SectionCard id="basic-information" title="Basic information" required>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requisition-title">Job title<RequiredMark /></Label>
        <Input
          id="requisition-title"
          {...form.register('title')}
          placeholder="Senior Frontend Engineer"
          aria-invalid={!!errors.title}
          aria-required="true"
        />
        {errors.title ? <p className="text-xs text-destructive-text">{errors.title.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Department<RequiredMark /></Label>
          <Select
            value={departmentId ?? ''}
            onValueChange={(value) => form.setValue('departmentId', value || undefined, { shouldDirty: true })}
          >
            <SelectTrigger className="w-full" aria-required="true" aria-invalid={!!errors.departmentId}>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId ? <p className="text-xs text-destructive-text">{errors.departmentId.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Employment type<RequiredMark /></Label>
          <Select
            value={employmentType}
            onValueChange={(value) =>
              form.setValue('employmentType', value as CreateJobRequisitionInput['employmentType'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full time</SelectItem>
              <SelectItem value="PART_TIME">Part time</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
              <SelectItem value="INTERNSHIP">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requisition-openings">Openings<RequiredMark /></Label>
          <Input
            id="requisition-openings"
            type="number"
            min={1}
            {...form.register('openings', { valueAsNumber: true })}
            aria-invalid={!!errors.openings}
            aria-required="true"
          />
          {errors.openings ? <p className="text-xs text-destructive-text">{errors.openings.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requisition-location">Location</Label>
          <Input
            id="requisition-location"
            {...form.register('location')}
            placeholder="Bangalore, India"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="requisition-remote">Remote role</Label>
          <Switch
            id="requisition-remote"
            checked={isRemote ?? false}
            onCheckedChange={(checked) => form.setValue('isRemote', checked, { shouldDirty: true })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="target-hire-date">Target hire date</Label>
          <Popover open={targetDateOpen} onOpenChange={setTargetDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id="target-hire-date"
                type="button"
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !targetDate && 'text-neutral-400')}
              >
                <CalendarDays className="size-4" />
                {targetDate ? format(new Date(`${targetDate}T00:00:00`), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetDate ? new Date(`${targetDate}T00:00:00`) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
                  form.setValue('targetDate', local.toISOString().slice(0, 10), { shouldDirty: true });
                  setTargetDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </SectionCard>
  );
}
