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
  ownedOnly: boolean;
}

export function JobRequisitionPageShell({
  orgSlug,
  memberId,
  departments,
  permissions,
  ownedOnly,
}: Readonly<JobRequisitionPageShellProps>) {
  const shouldReduceMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const jobsDeleteScope = getScope(permissions, 'jobs', 'delete');
  const { data = [], isLoading, isError, error, refetch } = useJobRequisitionsQuery(orgSlug, memberId, ownedOnly);
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
        <div className="px-6 py-6 flex flex-col gap-6 max-w-7xl">
          {/* Page heading */}
          <section aria-labelledby="jobs-heading">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1
                  id="jobs-heading"
                  className="text-4xl font-semibold text-neutral-900 tracking-tight"
                >
                  {ownedOnly ? 'My Job Requisitions' : 'Job Requisitions'}
                </h1>
              </div>
            </div>
          </section>

          {/* Job requisitions table */}
          <motion.div {...motionProps}>
            <JobRequisitionTable
              orgSlug={orgSlug}
              ownedOnly={ownedOnly}
              data={data}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
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
