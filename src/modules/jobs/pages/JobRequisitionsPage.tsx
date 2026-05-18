'use client';

import { useRouter } from 'next/navigation';

import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { EmptyRequisitionsState } from '@/modules/jobs/components/EmptyRequisitionsState';
import { JobRequisitionTable } from '@/modules/jobs/components/JobRequisitionTable';
import { useJobRequisitionsQuery } from '@/modules/jobs/hooks/useJobRequisitionsQuery';

interface JobRequisitionsPageProps {
  orgSlug: string;
  memberId: string;
  permissions: RolePermissions | null;
}

export function JobRequisitionsPage({
  orgSlug,
  memberId,
  permissions,
}: Readonly<JobRequisitionsPageProps>) {
  const router = useRouter();
  const jobsViewScope = getScope(permissions, 'jobs', 'view');
  const jobsApproveScope = getScope(permissions, 'jobs', 'approve');
  const effectiveViewScope =
    jobsViewScope === 'organization' || jobsApproveScope === 'organization'
      ? 'organization'
      : jobsViewScope;
  const showRaisedBy = effectiveViewScope === 'organization';
  const { data = [], isError, error, isLoading, refetch } = useJobRequisitionsQuery(
    orgSlug,
    memberId,
    effectiveViewScope,
  );
  const visibleRequisitions =
    effectiveViewScope === 'self'
      ? data.filter((requisition) => requisition.raisedById === memberId)
      : data;

  return (
    <div className="min-h-full bg-canvas">
      <div className="flex min-h-full flex-1 flex-col gap-6">
        <div className="flex items-start justify-between px-4 pb-2 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Job Requisitions
          </h1>
        </div>

        {!isLoading && !isError && visibleRequisitions.length === 0 ? (
          <EmptyRequisitionsState onCreate={() => router.push(`/${orgSlug}/jobs/new`)} />
        ) : (
          <JobRequisitionTable
            data={visibleRequisitions}
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
            showRaisedBy={showRaisedBy}
            onRowClick={(id) => router.push(`/${orgSlug}/jobs/${id}`)}
            onNewRequisition={() => router.push(`/${orgSlug}/jobs/new`)}
          />
        )}
      </div>
    </div>
  );
}
