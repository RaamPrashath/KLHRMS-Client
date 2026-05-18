'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { ApprovalPreviewSection } from '@/modules/jobs/components/sections/ApprovalPreviewSection';
import { BasicInfoSection } from '@/modules/jobs/components/sections/BasicInfoSection';
import { CandidateRequirementsSection } from '@/modules/jobs/components/sections/CandidateRequirementsSection';
import { CompensationSection } from '@/modules/jobs/components/sections/CompensationSection';
import { HiringContextSection } from '@/modules/jobs/components/sections/HiringContextSection';
import { PostingContentSection } from '@/modules/jobs/components/sections/PostingContentSection';
import { StickySummaryPanel } from '@/modules/jobs/components/StickySummaryPanel';
import { useAutoSaveDraft } from '@/modules/jobs/hooks/useAutoSaveDraft';
import { useSubmitJobRequisition } from '@/modules/jobs/hooks/useJobRequisitionMutations';
import {
  createJobRequisitionSchema,
  type CreateJobRequisitionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  JobDepartmentOption,
  JobRequisitionRecord,
  OrgMemberOption,
} from '@/modules/jobs/types/jobRequisitionTypes';

interface CreateJobRequisitionPageProps {
  orgSlug: string;
  memberId: string;
  departments: JobDepartmentOption[];
  orgMembers: OrgMemberOption[];
  permissions: RolePermissions | null;
  initialData?: JobRequisitionRecord | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return fallback;
}

function dateInputValue(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function buildDefaultValues(initialData?: JobRequisitionRecord | null): CreateJobRequisitionInput {
  return {
    title: initialData?.title ?? '',
    departmentId: initialData?.departmentId ?? undefined,
    employmentType: initialData?.employmentType ?? 'FULL_TIME',
    openings: initialData?.openings ?? 1,
    hiringReason: initialData?.hiringReason ?? null,
    priority: initialData?.priority ?? 'MEDIUM',
    replacementForId: initialData?.replacementForId ?? null,
    businessJustification: initialData?.businessJustification ?? '',
    salaryMin: initialData?.salaryMin ?? null,
    salaryMax: initialData?.salaryMax ?? null,
    currency: initialData?.currency ?? 'INR',
    salaryVisibility: initialData?.salaryVisibility ?? 'INTERNAL_ONLY',
    skills: initialData?.skills ?? [],
    experienceLevel: initialData?.experienceLevel ?? null,
    minExperience: initialData?.minExperience ?? null,
    education: initialData?.education ?? '',
    certifications: initialData?.certifications ?? [],
    roleSummary: initialData?.roleSummary ?? '',
    responsibilities: initialData?.responsibilities ?? '',
    requirementsRich: initialData?.requirementsRich ?? '',
    benefits: initialData?.benefits ?? '',
    aboutTeam: initialData?.aboutTeam ?? '',
    description: initialData?.description ?? '',
    requirements: initialData?.requirements ?? '',
    location: initialData?.location ?? '',
    isRemote: initialData?.isRemote ?? false,
    targetDate: dateInputValue(initialData?.targetDate ?? null),
  };
}

export function CreateJobRequisitionPage({
  orgSlug,
  memberId,
  departments,
  orgMembers,
  permissions,
  initialData,
}: Readonly<CreateJobRequisitionPageProps>) {
  const router = useRouter();
  const submitMutation = useSubmitJobRequisition(orgSlug, memberId);
  const createScope = getScope(permissions, 'jobs', 'create');
  const canCreate = createScope !== 'none';
  const isEdit = !!initialData;

  const form = useForm<CreateJobRequisitionInput>({
    resolver: zodResolver(createJobRequisitionSchema),
    mode: 'onChange',
    defaultValues: buildDefaultValues(initialData),
  });

  const watchedValues = useWatch({ control: form.control });
  const { draftId, error, isSaving, lastSaved, save } = useAutoSaveDraft({
    orgSlug,
    memberId,
    formValues: watchedValues as Record<string, unknown>,
    draftId: initialData?.id ?? null,
    enabled: canCreate,
  });

  const completedSections = [
    !!watchedValues.title?.trim(),
    !!watchedValues.hiringReason && !!watchedValues.businessJustification?.trim(),
    watchedValues.salaryMin != null || watchedValues.salaryMax != null,
    (watchedValues.skills?.length ?? 0) > 0 || !!watchedValues.experienceLevel,
    !!watchedValues.roleSummary || !!watchedValues.responsibilities || !!watchedValues.requirementsRich,
    true,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!form.formState.isDirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  const handleSaveDraft = useCallback(async () => {
    if (!canCreate) {
      toast.error('You do not have permission to create requisitions');
      return;
    }
    if (!watchedValues.title?.trim()) {
      form.setError('title', { message: 'Title is required before saving' });
      toast.error('Add a job title before saving');
      return;
    }
    try {
      await save();
      toast.success(isEdit ? 'Requisition updated' : 'Draft saved');
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, isEdit ? 'Failed to update requisition' : 'Failed to save draft'));
    }
  }, [canCreate, form, isEdit, save, watchedValues.title]);

  const handleSubmitForApproval = form.handleSubmit(async () => {
    if (!canCreate) {
      toast.error('You do not have permission to submit requisitions');
      return;
    }
    try {
      const savedId = await save();
      const requisitionId = savedId ?? draftId;
      if (!requisitionId) {
        toast.error('Save the draft before submitting');
        return;
      }
      await submitMutation.mutateAsync(requisitionId);
      toast.success('Requisition submitted for approval');
      router.push(`/${orgSlug}/jobs/${requisitionId}`);
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Failed to submit requisition'));
    }
  });

  if (!canCreate) {
    return (
      <div className="min-h-full bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-warning-text" />
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">
                {isEdit ? 'Edit Requisition' : 'Create Requisition'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Your role does not include permission to create job requisitions.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5"
                onClick={() => router.push(`/${orgSlug}/jobs`)}
              >
                <ArrowLeft className="size-4" />
                Back to requisitions
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas">
      <div className="sticky top-0 z-20 border-b border-neutral-100 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Back to requisitions"
              onClick={() => router.push(`/${orgSlug}/jobs`)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                {isEdit ? 'Edit Requisition' : 'Create Requisition'}
              </h1>
              <p className="text-sm text-neutral-500">
                {isEdit
                  ? 'Update the draft requisition before sending it for approval.'
                  : 'Build the hiring request, save a draft, then send it for approval.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-11 lg:pl-0">
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <Save className="size-3.5" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-success-text">
                <CheckCircle2 className="size-3.5" />
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
            {error ? <span className="text-xs text-destructive-text">Autosave failed</span> : null}
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
              <Save className="size-4" />
              {isEdit ? 'Save Changes' : 'Save Draft'}
            </Button>
            <Button type="button" onClick={handleSubmitForApproval} disabled={submitMutation.isPending || isSaving}>
              <Send className="size-4" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <form className="flex-1 space-y-6 lg:max-w-3xl" onSubmit={(event) => event.preventDefault()}>
          <BasicInfoSection form={form} departments={departments} />
          <HiringContextSection form={form} orgMembers={orgMembers} />
          <CompensationSection form={form} />
          <CandidateRequirementsSection form={form} />
          <PostingContentSection form={form} />
          <ApprovalPreviewSection />
        </form>

        <StickySummaryPanel
          status="Draft"
          createdByName="You"
          completionCount={completedSections}
          totalSections={6}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      </div>
    </div>
  );
}
