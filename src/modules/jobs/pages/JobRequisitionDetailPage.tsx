'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { ApprovalDialog } from '@/modules/jobs/components/ApprovalDialog';
import {
  useApproveJobRequisition,
  useRejectJobRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionMutations';
import {
  useJobRequisitionDetailQuery,
  useReEvaluateRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';
import { CreateJobRequisitionPage } from '@/modules/jobs/pages/CreateJobRequisitionPage';
import type { JobRequisitionDecisionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  JobDepartmentOption,
  OrgMemberOption,
} from '@/modules/jobs/types/jobRequisitionTypes';

interface JobRequisitionDetailPageProps {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  departments: JobDepartmentOption[];
  orgMembers: OrgMemberOption[];
  permissions: RolePermissions | null;
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

export function JobRequisitionDetailPage({
  orgSlug,
  memberId,
  requisitionId,
  departments,
  orgMembers,
  permissions,
}: Readonly<JobRequisitionDetailPageProps>) {
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);
  const {
    data: requisition,
    error,
    isError,
    isLoading,
    refetch,
  } = useJobRequisitionDetailQuery(orgSlug, memberId, requisitionId);
  const approveMutation = useApproveJobRequisition(orgSlug, memberId);
  const rejectMutation = useRejectJobRequisition(orgSlug, memberId);
  const reEvaluateMutation = useReEvaluateRequisition(orgSlug, memberId, requisitionId);
  const approveScope = getScope(permissions, 'jobs', 'approve');

  async function handleApprove(values: JobRequisitionDecisionInput) {
    try {
      await approveMutation.mutateAsync({ requisitionId, data: values });
      toast.success('Requisition approved');
      await refetch();
    } catch (approveError) {
      toast.error(getErrorMessage(approveError, 'Failed to approve requisition'));
    }
  }

  async function handleReEvaluate() {
    try {
      await reEvaluateMutation.mutateAsync();
      toast.success('Re-evaluation started — results will update as candidates are analyzed');
      await refetch();
    } catch (reevaluateError) {
      toast.error(getErrorMessage(reevaluateError, 'Failed to re-evaluate requisition'));
    }
  }

  async function handleDecision(values: JobRequisitionDecisionInput) {
    if (dialogMode !== 'reject') return;
    try {
      await rejectMutation.mutateAsync({ requisitionId, data: values });
      toast.success('Requisition rejected');
      setDialogMode(null);
      await refetch();
    } catch (rejectError) {
      toast.error(getErrorMessage(rejectError, 'Failed to reject requisition'));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-canvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-9 w-56" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-12 px-4 pb-12 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1 space-y-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-surface p-6 shadow-[var(--shadow-1)]">
                <div className="mb-5 border-b border-neutral-200 pb-3">
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>

          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-18 space-y-4">
              <div className="rounded-xl bg-surface-subtle p-4">
                <Skeleton className="mb-3 h-3 w-24" />
                <Skeleton className="mb-4 h-1.5 w-full rounded-full" />
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-lg" />
                  ))}
                </div>
                <Skeleton className="mt-4 h-3 w-32" />
              </div>
              <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                <Skeleton className="mb-3 h-3 w-20" />
                <div className="space-y-2.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="size-4 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (isError || !requisition) {
    return (
      <div className="min-h-full bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-warning-text" />
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Failed to load requisition</h1>
              <p className="mt-1 text-sm text-neutral-500">
                {getErrorMessage(error, 'The requisition could not be loaded.')}
              </p>
              <Button type="button" className="mt-5" onClick={() => refetch()}>
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canReview =
    approveScope === 'organization' &&
    requisition.currentUserCanApprove &&
    (requisition.status === 'PENDING_APPROVAL' || requisition.status === 'PARTIALLY_APPROVED');
  const formMode = canReview ? 'review' : requisition.canEdit ? 'edit' : 'readonly';
  const canReEvaluate = ['APPROVED', 'PUBLISHED', 'ACTIVE_HIRING', 'FILLED', 'CLOSED'].includes(requisition.status);

  return (
    <>
      {canReEvaluate ? (
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-4 pb-2 pt-2 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReEvaluate}
            disabled={reEvaluateMutation.isPending}
          >
            <RefreshCw className={`size-4 ${reEvaluateMutation.isPending ? 'animate-spin' : ''}`} />
            {reEvaluateMutation.isPending ? 'Re-evaluating...' : 'Re-evaluate AI'}
          </Button>
        </div>
      ) : null}
      <CreateJobRequisitionPage
        key={`${requisition.id}-${formMode}`}
        orgSlug={orgSlug}
        memberId={memberId}
        departments={departments}
        orgMembers={orgMembers}
        permissions={permissions}
        initialData={requisition}
        mode={formMode}
        approveLoading={approveMutation.isPending}
        rejectLoading={rejectMutation.isPending}
        onApprove={handleApprove}
        onReject={() => setDialogMode('reject')}
      />

      <ApprovalDialog
        key={`${dialogMode ?? 'closed'}-${requisition.id}`}
        open={dialogMode !== null}
        mode={dialogMode ?? 'reject'}
        requisition={requisition}
        loading={rejectMutation.isPending}
        departments={departments}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null);
        }}
        onConfirm={handleDecision}
      />
    </>
  );
}
