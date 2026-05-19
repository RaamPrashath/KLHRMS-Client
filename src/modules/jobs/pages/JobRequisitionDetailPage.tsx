'use client';

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { ApprovalDialog } from '@/modules/jobs/components/ApprovalDialog';
import {
  useApproveJobRequisition,
  useRejectJobRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionMutations';
import { useJobRequisitionDetailQuery } from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';
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
      <div className="flex min-h-full items-center justify-center bg-canvas">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="size-4 animate-spin" />
          Loading requisition...
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

  return (
    <>
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
