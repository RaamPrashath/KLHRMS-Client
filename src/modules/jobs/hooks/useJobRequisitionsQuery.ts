'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchJobRequisitionsAction } from '@/modules/jobs/api/jobRequisitionServerActions';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';
import type { PermissionScope } from '@/lib/hrms-roles';

export function useJobRequisitionsQuery(
  orgSlug: string,
  memberId: string,
  viewScope: PermissionScope,
) {
  return useQuery<JobRequisitionRecord[], Error>({
    queryKey: ['job-requisitions', orgSlug, memberId, viewScope],
    queryFn: () => fetchJobRequisitionsAction({ orgSlug, memberId, viewScope }),
    enabled: !!orgSlug && !!memberId,
  });
}
