'use client';

import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ActivityTab } from '@/modules/jobs/components/ActivityTab';
import { ApprovalDialog } from '@/modules/jobs/components/ApprovalDialog';
import { ApprovalHistoryTab } from '@/modules/jobs/components/ApprovalHistoryTab';
import { HiringTeamTab } from '@/modules/jobs/components/HiringTeamTab';
import { OverviewTab } from '@/modules/jobs/components/OverviewTab';
import { PipelineTab } from '@/modules/jobs/components/PipelineTab';
import { RequisitionHeader } from '@/modules/jobs/components/RequisitionHeader';
import {
  useApproveJobRequisition,
  useCloseJobRequisition,
  useRejectJobRequisition,
  useReopenJobRequisition,
  useSubmitJobRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionMutations';
import { useJobRequisitionDetailQuery } from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';
import type { JobRequisitionDecisionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type {
  JobDepartmentOption,
  JobRequisitionRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';

interface JobRequisitionDetailPageProps {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  departments: JobDepartmentOption[];
}

const APPROVED_STATUSES: JobRequisitionRecord['status'][] = [
  'APPROVED',
  'PUBLISHED',
  'ACTIVE_HIRING',
  'FILLED',
];

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
}: Readonly<JobRequisitionDetailPageProps>) {
  const router = useRouter();
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);
  const {
    data: requisition,
    error,
    isError,
    isLoading,
    refetch,
  } = useJobRequisitionDetailQuery(orgSlug, memberId, requisitionId);
  const submitMutation = useSubmitJobRequisition(orgSlug, memberId);
  const approveMutation = useApproveJobRequisition(orgSlug, memberId);
  const rejectMutation = useRejectJobRequisition(orgSlug, memberId);
  const closeMutation = useCloseJobRequisition(orgSlug, memberId);
  const reopenMutation = useReopenJobRequisition(orgSlug, memberId);
  const showApprovedTabs = requisition ? APPROVED_STATUSES.includes(requisition.status) : false;

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync(requisitionId);
      toast.success('Requisition submitted for approval');
      await refetch();
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Failed to submit requisition'));
    }
  }

  async function handleClose() {
    if (!window.confirm('Close this requisition?')) return;
    try {
      await closeMutation.mutateAsync(requisitionId);
      toast.success('Requisition closed');
      await refetch();
    } catch (closeError) {
      toast.error(getErrorMessage(closeError, 'Failed to close requisition'));
    }
  }

  async function handleReopen() {
    if (!window.confirm('Reopen this requisition?')) return;
    try {
      await reopenMutation.mutateAsync(requisitionId);
      toast.success('Requisition reopened');
      await refetch();
    } catch (reopenError) {
      toast.error(getErrorMessage(reopenError, 'Failed to reopen requisition'));
    }
  }

  async function handleDecision(values: JobRequisitionDecisionInput) {
    if (!dialogMode) return;
    if (dialogMode === 'approve') {
      await approveMutation.mutateAsync({ requisitionId, data: values });
      toast.success('Requisition approved');
    } else {
      await rejectMutation.mutateAsync({ requisitionId, data: values });
      toast.success('Requisition rejected');
    }
    setDialogMode(null);
    await refetch();
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
          <h1 className="text-xl font-semibold text-neutral-900">Failed to load requisition</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {getErrorMessage(error, 'The requisition could not be loaded.')}
          </p>
          <div className="mt-5 flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(`/${orgSlug}/jobs`)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button type="button" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-4"
          onClick={() => router.push(`/${orgSlug}/jobs`)}
        >
          <ArrowLeft className="size-4" />
          Back to requisitions
        </Button>

        <RequisitionHeader
          requisition={requisition}
          onSubmit={handleSubmit}
          onEdit={() => router.push(`/${orgSlug}/jobs/${requisition.id}/edit`)}
          onApprove={() => setDialogMode('approve')}
          onReject={() => setDialogMode('reject')}
          onClose={handleClose}
          onReopen={handleReopen}
          submitLoading={submitMutation.isPending}
          closeLoading={closeMutation.isPending}
          reopenLoading={reopenMutation.isPending}
        />

        <Tabs defaultValue="overview" className="mt-6">
          <div className="overflow-x-auto">
            <TabsList variant="line" className="min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="approval-history">Approval History</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              {showApprovedTabs ? <TabsTrigger value="pipeline">Pipeline</TabsTrigger> : null}
              {showApprovedTabs ? <TabsTrigger value="hiring-team">Hiring Team</TabsTrigger> : null}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-5">
            <OverviewTab requisition={requisition} />
          </TabsContent>
          <TabsContent value="approval-history" className="mt-5">
            <ApprovalHistoryTab approvals={requisition.approvals} />
          </TabsContent>
          <TabsContent value="activity" className="mt-5">
            <ActivityTab orgSlug={orgSlug} memberId={memberId} requisitionId={requisitionId} />
          </TabsContent>
          {showApprovedTabs ? (
            <TabsContent value="pipeline" className="mt-5">
              <PipelineTab requisition={requisition} />
            </TabsContent>
          ) : null}
          {showApprovedTabs ? (
            <TabsContent value="hiring-team" className="mt-5">
              <HiringTeamTab requisition={requisition} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <ApprovalDialog
        key={`${dialogMode ?? 'closed'}-${requisition.id}`}
        open={dialogMode !== null}
        mode={dialogMode ?? 'approve'}
        requisition={requisition}
        loading={approveMutation.isPending || rejectMutation.isPending}
        departments={departments}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null);
        }}
        onConfirm={handleDecision}
      />
    </div>
  );
}
