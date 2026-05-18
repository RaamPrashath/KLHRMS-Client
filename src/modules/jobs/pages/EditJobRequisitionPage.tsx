'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type RolePermissions } from '@/lib/hrms-roles';
import { CreateJobRequisitionPage } from '@/modules/jobs/pages/CreateJobRequisitionPage';
import { useJobRequisitionDetailQuery } from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';
import type {
  JobDepartmentOption,
  OrgMemberOption,
} from '@/modules/jobs/types/jobRequisitionTypes';

interface EditJobRequisitionPageProps {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  departments: JobDepartmentOption[];
  orgMembers: OrgMemberOption[];
  permissions: RolePermissions | null;
}

export function EditJobRequisitionPage({
  orgSlug,
  memberId,
  requisitionId,
  departments,
  orgMembers,
  permissions,
}: Readonly<EditJobRequisitionPageProps>) {
  const { data, error, isError, isLoading, refetch } = useJobRequisitionDetailQuery(
    orgSlug,
    memberId,
    requisitionId,
  );

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

  if (isError || !data) {
    return (
      <div className="min-h-full bg-canvas px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-warning-text" />
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Failed to load requisition</h1>
              <p className="mt-1 text-sm text-neutral-500">
                {error?.message ?? 'The requisition could not be loaded.'}
              </p>
              <Button type="button" className="mt-5" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CreateJobRequisitionPage
      key={data.id}
      orgSlug={orgSlug}
      memberId={memberId}
      departments={departments}
      orgMembers={orgMembers}
      permissions={permissions}
      initialData={data}
    />
  );
}
