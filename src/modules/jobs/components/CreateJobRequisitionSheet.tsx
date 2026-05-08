'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createJobRequisitionSchema,
  type CreateJobRequisitionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import { useCreateJobRequisition } from '@/modules/jobs/hooks/useJobRequisitionMutations';
import { EMPLOYMENT_TYPES, type JobDepartmentOption } from '@/modules/jobs/types/jobRequisitionTypes';

interface CreateJobRequisitionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  departments: JobDepartmentOption[];
}

interface JobRequisitionFormValues {
  title: string;
  departmentId: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  openings: number;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  description: string;
  requirements: string;
  skillsText: string;
  location: string;
  isRemote: boolean;
  targetDate: string;
}

const jobRequisitionFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  departmentId: z.string(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  openings: z.number().int().min(1, 'At least one opening is required'),
  salaryMin: z.string(),
  salaryMax: z.string(),
  currency: z.string().min(1, 'Currency is required').max(10, 'Currency is too long'),
  description: z.string(),
  requirements: z.string(),
  skillsText: z.string(),
  location: z.string(),
  isRemote: z.boolean(),
  targetDate: z.string(),
}).superRefine((value, ctx) => {
  const salaryMin = value.salaryMin.trim() ? Number(value.salaryMin) : null;
  const salaryMax = value.salaryMax.trim() ? Number(value.salaryMax) : null;
  if (salaryMin != null && Number.isNaN(salaryMin)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salaryMin'],
      message: 'Minimum salary must be a valid number',
    });
  }
  if (salaryMax != null && Number.isNaN(salaryMax)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salaryMax'],
      message: 'Maximum salary must be a valid number',
    });
  }
  if (
    salaryMin != null &&
    salaryMax != null &&
    !Number.isNaN(salaryMin) &&
    !Number.isNaN(salaryMax) &&
    salaryMax < salaryMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salaryMax'],
      message: 'Maximum salary must be greater than or equal to minimum salary',
    });
  }
});

function buildInput(values: JobRequisitionFormValues): CreateJobRequisitionInput {
  const salaryMin = values.salaryMin.trim() ? Number(values.salaryMin) : null;
  const salaryMax = values.salaryMax.trim() ? Number(values.salaryMax) : null;

  return {
    title: values.title.trim(),
    departmentId: values.departmentId || undefined,
    employmentType: values.employmentType,
    openings: values.openings,
    salaryMin,
    salaryMax,
    currency: values.currency.trim() || 'INR',
    description: values.description.trim() || null,
    requirements: values.requirements.trim() || null,
    skills: values.skillsText
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean),
    location: values.location.trim() || null,
    isRemote: values.isRemote,
    targetDate: values.targetDate || null,
  };
}

export function CreateJobRequisitionSheet({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  departments,
}: Readonly<CreateJobRequisitionSheetProps>) {
  const mutation = useCreateJobRequisition(orgSlug, memberId);
  const form = useForm<JobRequisitionFormValues>({
    resolver: zodResolver(jobRequisitionFormSchema),
    defaultValues: {
      title: '',
      departmentId: '',
      employmentType: 'FULL_TIME',
      openings: 1,
      salaryMin: '',
      salaryMax: '',
      currency: 'INR',
      description: '',
      requirements: '',
      skillsText: '',
      location: '',
      isRemote: false,
      targetDate: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  async function onSubmit(values: JobRequisitionFormValues) {
    try {
      await mutation.mutateAsync(buildInput(values));
      toast.success('Job requisition created as draft');
      onOpenChange(false);
      form.reset();
    } catch (error) {
      let message = 'Failed to create job requisition';
      try {
        const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
        if (parsed.message) message = parsed.message;
      } catch {
        // ignore parse failures
      }
      toast.error(message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto bg-surface sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Create Job Requisition</SheetTitle>
          <SheetDescription>Create a draft requisition and submit it for approval when ready.</SheetDescription>
        </SheetHeader>

        <form
          id="create-job-requisition-form"
          className="mt-6 flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job-title">Job title</Label>
            <Input id="job-title" {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive-text">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Select
                value={form.watch('departmentId')}
                onValueChange={(value) => form.setValue('departmentId', value)}
              >
                <SelectTrigger>
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
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Employment type</Label>
              <Select
                value={form.watch('employmentType')}
                onValueChange={(value) => form.setValue('employmentType', value as JobRequisitionFormValues['employmentType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="openings">Openings</Label>
              <Input
                id="openings"
                type="number"
                min="1"
                {...form.register('openings', { valueAsNumber: true })}
              />
              {form.formState.errors.openings ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.openings.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={10} {...form.register('currency')} />
              {form.formState.errors.currency ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.currency.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salary-min">Salary min</Label>
              <Input id="salary-min" type="number" min="0" step="0.01" {...form.register('salaryMin')} />
              {form.formState.errors.salaryMin ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.salaryMin.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salary-max">Salary max</Label>
              <Input id="salary-max" type="number" min="0" step="0.01" {...form.register('salaryMax')} />
              {form.formState.errors.salaryMax ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.salaryMax.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register('location')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target-date">Target hire date</Label>
              <Input id="target-date" type="date" {...form.register('targetDate')} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
            <div>
              <Label htmlFor="is-remote">Remote role</Label>
              <p className="text-xs text-neutral-500">Mark this requisition as remote-friendly.</p>
            </div>
            <Switch
              id="is-remote"
              checked={form.watch('isRemote')}
              onCheckedChange={(checked) => form.setValue('isRemote', checked)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skills-text">Skills</Label>
            <Input id="skills-text" placeholder="React, TypeScript, Hiring" {...form.register('skillsText')} />
            <p className="text-xs text-neutral-500">Use comma-separated values.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} {...form.register('description')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea id="requirements" rows={4} {...form.register('requirements')} />
          </div>
        </form>

        <SheetFooter className="mt-6 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border border-neutral-200 px-4 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-job-requisition-form"
            disabled={mutation.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating...' : 'Create Draft'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
