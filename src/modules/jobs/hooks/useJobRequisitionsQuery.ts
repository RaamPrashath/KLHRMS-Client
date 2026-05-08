'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchJobRequisitionsAction } from '@/modules/jobs/api/jobRequisitionServerActions';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

export function useJobRequisitionsQuery(
  orgSlug: string,
  memberId: string,
  ownedOnly: boolean,
) {
  return useQuery<JobRequisitionRecord[], Error>({
    queryKey: ['job-requisitions', orgSlug, ownedOnly],
    queryFn: () => fetchJobRequisitionsAction({ orgSlug, memberId, ownedOnly }),
    enabled: !!orgSlug && !!memberId,
  });
}
