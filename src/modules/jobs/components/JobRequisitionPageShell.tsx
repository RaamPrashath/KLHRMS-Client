'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { CreateJobRequisitionSheet } from '@/modules/jobs/components/CreateJobRequisitionSheet';
import { JobRequisitionTable } from '@/modules/jobs/components/JobRequisitionTable';
import {
  useApproveJobRequisition,
  useCloseJobRequisition,
  useRejectJobRequisition,
  useSubmitJobRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionMutations';
import { useJobRequisitionsQuery } from '@/modules/jobs/hooks/useJobRequisitionsQuery';
import type { JobDepartmentOption } from '@/modules/jobs/types/jobRequisitionTypes';

interface JobRequisitionPageShellProps {
  orgSlug: string;
  memberId: string;
  departments: JobDepartmentOption[];
  permissions: RolePermissions | null;
  ownedOnly: boolean;
}

function parseError(error: Error | null) {
  if (!error) return 'Failed to load job requisitions.';
  try {
    const parsed = JSON.parse(error.message);
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return 'Failed to load job requisitions.';
}

export function JobRequisitionPageShell({
  orgSlug,
  memberId,
  departments,
  permissions,
  ownedOnly,
}: Readonly<JobRequisitionPageShellProps>) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const jobsDeleteScope = getScope(permissions, 'jobs', 'delete');
  const { data = [], isLoading, isError, error } = useJobRequisitionsQuery(orgSlug, memberId, ownedOnly);
  const submitMutation = useSubmitJobRequisition(orgSlug, memberId);
  const approveMutation = useApproveJobRequisition(orgSlug, memberId);
  const rejectMutation = useRejectJobRequisition(orgSlug, memberId);
  const closeMutation = useCloseJobRequisition(orgSlug, memberId);

  if (isError) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-destructive-text">
        {parseError(error)}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-subtle">
              <BriefcaseBusiness className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                {ownedOnly ? 'My Job Requisitions' : 'Jobs'}
              </h1>
              <p className="text-sm text-neutral-500">
                {ownedOnly
                  ? 'Track your requisitions and approval progress.'
                  : 'View the requisitions visible to your current role and review pending approvals.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!ownedOnly ? (
              <Button asChild variant="outline">
                <Link href={`/${orgSlug}/jobs/requisitions`}>My Requisitions</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={`/${orgSlug}/jobs`}>All Visible Jobs</Link>
              </Button>
            )}
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="mr-1 size-4" />
              New Requisition
            </Button>
          </div>
        </div>

        <JobRequisitionTable
          data={data}
          isLoading={isLoading}
          showRaisedBy={!ownedOnly}
          canClose={jobsDeleteScope === 'organization'}
          submitLoading={submitMutation.isPending}
          approveLoading={approveMutation.isPending}
          rejectLoading={rejectMutation.isPending}
          closeLoading={closeMutation.isPending}
          onSubmit={async (requisitionId) => {
            await submitMutation.mutateAsync(requisitionId);
          }}
          onApprove={async (requisitionId, comment) => {
            await approveMutation.mutateAsync({ requisitionId, data: { comment } });
          }}
          onReject={async (requisitionId, comment) => {
            await rejectMutation.mutateAsync({ requisitionId, data: { comment } });
          }}
          onClose={async (requisitionId) => {
            await closeMutation.mutateAsync(requisitionId);
          }}
        />
      </div>

      <CreateJobRequisitionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        departments={departments}
      />
    </>
  );
}
