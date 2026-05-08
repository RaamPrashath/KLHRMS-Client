'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

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
  type PublicCareerApplicationFormValues,
} from '@/modules/jobs/schema/publicCareerSchemas';
import { usePublicCareerApplication } from '@/modules/jobs/hooks/usePublicCareerQueries';

interface CareerApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  organizationId: string;
  jobTitle: string;
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
    // ignore parse failures
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
}: Readonly<CareerApplicationDialogProps>) {
  const mutation = usePublicCareerApplication(jobId);
  const form = useForm<PublicCareerApplicationFormValues>({
    resolver: zodResolver(publicCareerApplicationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      coverLetter: '',
      resumeFile: null,
    },
  });

  const resumeFile = useWatch({
    control: form.control,
    name: 'resumeFile',
  });
  const resumeLabel = useMemo(() => resumeFile?.name ?? 'Choose a resume file', [resumeFile]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  async function onSubmit(values: PublicCareerApplicationFormValues) {
    if (!(values.resumeFile instanceof File)) {
      toast.error('Resume is required');
      return;
    }

    try {
      const resumeUrl = await uploadResume({
        file: values.resumeFile,
        organizationId,
        jobId,
      });

      await mutation.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim() || undefined,
        linkedinUrl: values.linkedinUrl.trim() || undefined,
        coverLetter: values.coverLetter.trim() || undefined,
        resumeUrl,
      });

      toast.success(`Application submitted for ${jobTitle}`);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit application'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription>
            Submit your details and resume to create your candidate application.
          </DialogDescription>
        </DialogHeader>

        <form
          id="career-application-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="career-first-name">First name</FieldLabel>
              <Input id="career-first-name" {...form.register('firstName')} />
              <FieldError errors={[form.formState.errors.firstName]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="career-last-name">Last name</FieldLabel>
              <Input id="career-last-name" {...form.register('lastName')} />
              <FieldError errors={[form.formState.errors.lastName]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="career-email">Email</FieldLabel>
              <Input id="career-email" type="email" {...form.register('email')} />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="career-phone">Phone</FieldLabel>
              <Input id="career-phone" {...form.register('phone')} />
              <FieldError errors={[form.formState.errors.phone]} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="career-linkedin">LinkedIn URL</FieldLabel>
            <Input id="career-linkedin" placeholder="https://linkedin.com/in/your-profile" {...form.register('linkedinUrl')} />
            <FieldError errors={[form.formState.errors.linkedinUrl]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="career-resume">Resume upload</FieldLabel>
            <Input
              id="career-resume"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                form.setValue('resumeFile', file, { shouldValidate: true, shouldDirty: true });
              }}
            />
            <p className="text-xs text-muted-foreground">{resumeLabel}</p>
            <FieldError errors={[form.formState.errors.resumeFile]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="career-cover-letter">Notes / cover letter</FieldLabel>
            <Textarea id="career-cover-letter" rows={6} {...form.register('coverLetter')} />
            <FieldError errors={[form.formState.errors.coverLetter]} />
          </Field>
        </form>

        <DialogFooter>
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
