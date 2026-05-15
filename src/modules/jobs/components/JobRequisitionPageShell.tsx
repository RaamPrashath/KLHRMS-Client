'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
}

export function JobRequisitionPageShell({
  orgSlug,
  memberId,
  departments,
  permissions,
}: Readonly<JobRequisitionPageShellProps>) {
  const shouldReduceMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const jobsViewScope = getScope(permissions, 'jobs', 'view');
  const jobsDeleteScope = getScope(permissions, 'jobs', 'delete');
  const showRaisedBy = jobsViewScope === 'organization';
  const canClose = jobsDeleteScope === 'organization' || jobsDeleteScope === 'self';
  const { data = [], isLoading, isError, error, refetch } = useJobRequisitionsQuery(orgSlug, memberId, jobsViewScope);
  const visibleRequisitions = jobsViewScope === 'self'
    ? data.filter((requisition) => requisition.raisedById === memberId)
    : data;
  const submitMutation = useSubmitJobRequisition(orgSlug, memberId);
  const approveMutation = useApproveJobRequisition(orgSlug, memberId);
  const rejectMutation = useRejectJobRequisition(orgSlug, memberId);
  const closeMutation = useCloseJobRequisition(orgSlug, memberId);

  const motionProps = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  };

  return (
    <>
      <main className="min-h-full bg-canvas">
        <div className="flex flex-col gap-6 flex-1 min-h-full">
          <div className="flex items-start justify-between ml-7 mt-7 mr-7">
            <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
              Job Requisitions
            </h1>
          </div>

          <motion.div {...motionProps}>
            <JobRequisitionTable
              data={visibleRequisitions}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
              showRaisedBy={showRaisedBy}
              canClose={canClose}
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
              onNewRequisition={() => setSheetOpen(true)}
            />
          </motion.div>
        </div>
      </main>

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
