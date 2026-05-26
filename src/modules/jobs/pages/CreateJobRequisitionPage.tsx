'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, Save, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { BasicInfoSection } from '@/modules/jobs/components/sections/BasicInfoSection';
import { CandidateRequirementsSection } from '@/modules/jobs/components/sections/CandidateRequirementsSection';
import { CompensationSection } from '@/modules/jobs/components/sections/CompensationSection';
import { HiringContextSection } from '@/modules/jobs/components/sections/HiringContextSection';
import { KnockoutRuleSection } from '@/modules/jobs/components/sections/KnockoutRuleSection';
import { PostingContentSection } from '@/modules/jobs/components/sections/PostingContentSection';
import { StickySummaryPanel } from '@/modules/jobs/components/StickySummaryPanel';
import { useAutoSaveDraft } from '@/modules/jobs/hooks/useAutoSaveDraft';
import { useSubmitJobRequisition } from '@/modules/jobs/hooks/useJobRequisitionMutations';
import {
  createJobRequisitionSchema,
  type CreateJobRequisitionInput,
  type JobRequisitionDecisionInput,
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
  mode?: 'create' | 'edit' | 'review' | 'readonly';
  approveLoading?: boolean;
  rejectLoading?: boolean;
  onApprove?: (values: JobRequisitionDecisionInput) => Promise<void>;
  onReject?: () => void;
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
    knockoutRule: initialData?.knockoutRule ?? '',
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
  mode,
  approveLoading,
  rejectLoading,
  onApprove,
  onReject,
}: Readonly<CreateJobRequisitionPageProps>) {
  const router = useRouter();
  const submitMutation = useSubmitJobRequisition(orgSlug, memberId);
  const createScope = getScope(permissions, 'jobs', 'create');
  const canCreate = createScope !== 'none';
  const isEdit = !!initialData;
  const pageMode = mode ?? (isEdit ? 'edit' : 'create');
  const isReview = pageMode === 'review';
  const isReadOnly = pageMode === 'readonly';
  const canUsePage = canCreate || isReview || isReadOnly;
  const canViewAiScreening =
    !!initialData &&
    ['APPROVED', 'PUBLISHED', 'ACTIVE_HIRING', 'FILLED', 'CLOSED'].includes(initialData.status);

  const form = useForm<CreateJobRequisitionInput>({
    resolver: zodResolver(createJobRequisitionSchema),
    mode: 'onChange',
    defaultValues: buildDefaultValues(initialData),
  });

  const watchedValues = useWatch({ control: form.control });
  const { draftId, error, isSaving, save } = useAutoSaveDraft({
    orgSlug,
    memberId,
    formValues: watchedValues as Record<string, unknown>,
    draftId: initialData?.id ?? null,
    enabled: canCreate && !isReview && !isReadOnly,
  });

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
    if (!canCreate || isReview || isReadOnly) {
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
  }, [canCreate, form, isEdit, isReadOnly, isReview, save, watchedValues.title]);

  const handleSubmitForApproval = form.handleSubmit(async () => {
    if (!canCreate || isReview || isReadOnly) {
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

  const handleApprove = form.handleSubmit(async (values) => {
    if (!onApprove) return;
    await onApprove(values);
  });

  const sectionCompletion = useMemo(
    () => ({
      basicInfo: !!(watchedValues.title && watchedValues.departmentId),
      hiringContext: !!watchedValues.hiringReason,
      compensation: watchedValues.salaryMin != null || watchedValues.salaryMax != null,
      requirements:
        (watchedValues.skills?.length ?? 0) > 0 ||
        (watchedValues.certifications?.length ?? 0) > 0 ||
        !!watchedValues.experienceLevel ||
        watchedValues.minExperience != null ||
        !!watchedValues.education?.trim(),
      postingContent:
        !!watchedValues.roleSummary?.trim() ||
        !!watchedValues.responsibilities?.trim() ||
        !!watchedValues.requirementsRich?.trim() ||
        !!watchedValues.benefits?.trim() ||
        !!watchedValues.aboutTeam?.trim(),
    }),
    [watchedValues],
  );

  if (!canUsePage) {
    return (
      <div className="min-h-full bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-warning-text" />
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">
                {isEdit ? 'View Requisition' : 'Create Requisition'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Your role does not include permission to view this requisition form.
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back to requisitions"
            onClick={() => router.push(`/${orgSlug}/jobs`)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            {isReview ? 'Review Requisition' : isReadOnly ? 'View Requisition' : isEdit ? 'Edit Requisition' : 'Create Requisition'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {error ? <span className="text-xs text-destructive-text">Autosave failed</span> : null}
          {canViewAiScreening ? (
            <Button type="button" variant="outline" asChild>
              <Link href={`/${orgSlug}/jobs/${initialData.id}/ai-analyzed`}>
                <Brain className="size-4" />
                AI Screening
              </Link>
            </Button>
          ) : null}
          {isReview ? (
            <>
              <Button type="button" variant="destructive" onClick={onReject} disabled={approveLoading || rejectLoading}>
                <XCircle className="size-4" />
                Reject
              </Button>
              <Button type="submit" form="job-requisition-form" disabled={approveLoading || rejectLoading}>
                <CheckCircle2 className="size-4" />
                {approveLoading ? 'Approving...' : 'Approve'}
              </Button>
            </>
          ) : isReadOnly ? null : (
            <>
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                <Save className="size-4" />
                {isEdit ? 'Save Changes' : 'Save Draft'}
              </Button>
              <Button type="submit" form="job-requisition-form" disabled={submitMutation.isPending || isSaving}>
                <Send className="size-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-12 px-4 pb-12 sm:px-6 lg:px-8">
        <form
          id="job-requisition-form"
          className="min-w-0 flex-1 space-y-10"
          onSubmit={isReview ? handleApprove : handleSubmitForApproval}
        >
          <fieldset disabled={isReadOnly} className="space-y-10">
            <BasicInfoSection form={form} departments={departments} />
            <HiringContextSection form={form} orgMembers={orgMembers} />
            <CompensationSection form={form} />
            <CandidateRequirementsSection form={form} />
            <PostingContentSection form={form} readOnly={isReadOnly} />
            <KnockoutRuleSection form={form} />
          </fieldset>
        </form>

        <StickySummaryPanel
          sectionCompletion={sectionCompletion}
          approvals={initialData?.approvals}
          showApprovals={!!initialData && initialData.status !== 'DRAFT'}
        />
      </div>
    </div>
  );
}
