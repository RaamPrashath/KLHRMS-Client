'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  publicCareerApplicationSchema,
  buildDynamicFormSchema,
  type DynamicFormFieldConfig,
  type PublicCareerApplicationFormValues,
} from '@/modules/jobs/schema/publicCareerSchemas';
import { usePublicCareerApplication } from '@/modules/jobs/hooks/usePublicCareerQueries';
import type { PublicCareerApplicationInput } from '@/modules/jobs/schema/publicCareerSchemas';
import { DynamicFormRenderer } from '@/modules/jobs/components/DynamicFormRenderer';

interface CareerApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  organizationId: string;
  jobTitle: string;
  formFields?: DynamicFormFieldConfig[];
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public environment variables are not configured');
  }

  return createClient(url, anonKey);
}

async function uploadResume(params: {
  file: File;
  organizationId: string;
  jobId: string;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const extension = params.file.name.split('.').pop()?.toLowerCase() ?? 'file';
  const key = `${params.organizationId}/${params.jobId}/${Date.now()}-${sanitizeFileName(params.file.name || `resume.${extension}`)}`;

  const { error } = await supabase.storage
    .from('resume')
    .upload(key, params.file, {
      cacheControl: '3600',
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from('resume').getPublicUrl(key);
  if (!data.publicUrl) {
    throw new Error('Failed to generate resume URL');
  }

  return data.publicUrl;
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function CareerApplicationDialog({
  open,
  onOpenChange,
  jobId,
  organizationId,
  jobTitle,
  formFields,
}: Readonly<CareerApplicationDialogProps>) {
  const mutation = usePublicCareerApplication(jobId);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  const dynamicSchema = useMemo(() => {
    if (!formFields || formFields.length === 0) return null;
    return buildDynamicFormSchema(formFields);
  }, [formFields]);

  const combinedSchema = useMemo(() => {
    if (!dynamicSchema) return publicCareerApplicationSchema;
    return publicCareerApplicationSchema.extend({
      customFields: dynamicSchema,
    });
  }, [dynamicSchema]);

  type CombinedFormValues = z.infer<typeof combinedSchema>;

  const form = useForm<CombinedFormValues>({
    resolver: zodResolver(combinedSchema) as Resolver<CombinedFormValues>,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      coverLetter: '',
      resumeFile: null,
      customFields: {},
    } as CombinedFormValues,
  });

  const resumeFile = useWatch({
    control: form.control,
    name: 'resumeFile',
  });
  const resumeLabel = useMemo(() => (resumeFile instanceof File ? resumeFile.name : 'Choose a resume file'), [resumeFile]);

  useEffect(() => {
    if (!open) {
      form.reset();
      setCustomFieldValues({});
    }
  }, [form, open]);

  function handleResumeFile(file: File | null) {
    form.setValue('resumeFile' as any, file, { shouldValidate: true, shouldDirty: true });
  }

  function handleCustomFieldChange(id: string, value: unknown) {
    setCustomFieldValues((prev) => ({ ...prev, [id]: value }));
    form.setValue('customFields' as any, { ...customFieldValues, [id]: value }, { shouldValidate: true });
  }

  async function onSubmit(values: CombinedFormValues) {
    const resumeFileValue = (values as any).resumeFile;
    if (!(resumeFileValue instanceof File)) {
      toast.error('Resume is required');
      return;
    }

    try {
      const resumeUrl = await uploadResume({
        file: resumeFileValue,
        organizationId,
        jobId,
      });

      const payload: PublicCareerApplicationInput = {
        firstName: (values as any).firstName.trim(),
        lastName: (values as any).lastName.trim(),
        email: (values as any).email.trim(),
        phone: ((values as any).phone?.trim()) || undefined,
        linkedinUrl: ((values as any).linkedinUrl?.trim()) || undefined,
        coverLetter: ((values as any).coverLetter?.trim()) || undefined,
        resumeUrl,
      };

      if (formFields && formFields.length > 0) {
        const customFields: Record<string, unknown> = {};
        for (const field of formFields) {
          const val = customFieldValues[field.id];
          if (val !== undefined && val !== '' && val !== false) {
            customFields[field.id] = val;
          }
        }
        if (Object.keys(customFields).length > 0) {
          payload.customFields = customFields;
        }
      }

      await mutation.mutateAsync(payload);

      toast.success(`Application submitted for ${jobTitle}`);
      form.reset();
      setCustomFieldValues({});
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit application'));
    }
  }

  const customFieldErrors = (form.formState.errors as any).customFields ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
        </DialogHeader>

        <form
          id="career-application-form"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="career-first-name">First name</FieldLabel>
              <Input id="career-first-name" {...form.register('firstName' as any)} />
              <FieldError errors={[form.formState.errors.firstName]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="career-last-name">Last name</FieldLabel>
              <Input id="career-last-name" {...form.register('lastName' as any)} />
              <FieldError errors={[form.formState.errors.lastName]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="career-email">Email</FieldLabel>
              <Input
                id="career-email"
                type="email"
                autoComplete="email"
                {...form.register('email' as any)}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="career-phone">Phone</FieldLabel>
              <Input id="career-phone" {...form.register('phone' as any)} />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="career-linkedin">LinkedIn URL</FieldLabel>
            <Input id="career-linkedin" placeholder="https://linkedin.com/in/your-profile" {...form.register('linkedinUrl' as any)} />
            <FieldError errors={[form.formState.errors.linkedinUrl]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="career-resume">Resume upload</FieldLabel>
            <Input
              id="career-resume"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                handleResumeFile(event.target.files?.[0] ?? null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleResumeFile(event.dataTransfer.files?.[0] ?? null);
              }}
            />
            <p className="text-xs text-muted-foreground">{resumeLabel}</p>
            <FieldError errors={[form.formState.errors.resumeFile]} />
          </Field>

          {formFields && formFields.length > 0 ? (
            <div className="border-t pt-4">
              <DynamicFormRenderer
                fields={formFields}
                values={customFieldValues}
                errors={customFieldErrors}
                onFieldChange={handleCustomFieldChange}
              />
            </div>
          ) : null}
        </form>

        <DialogFooter className="shrink-0 px-6 pb-6 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="career-application-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
