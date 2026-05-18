'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchJobRequisitionDetailAction,
  fetchRequisitionActivityAction,
} from '@/modules/jobs/api/jobRequisitionDetailActions';
import type {
  JobRequisitionRecord,
  RequisitionActivityEntry,
} from '@/modules/jobs/types/jobRequisitionTypes';

export function useJobRequisitionDetailQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<JobRequisitionRecord, Error>({
    queryKey: ['job-requisition-detail', orgSlug, requisitionId],
    queryFn: () => fetchJobRequisitionDetailAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
  });
}

export function useRequisitionActivityQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<RequisitionActivityEntry[], Error>({
    queryKey: ['job-requisition-activity', orgSlug, requisitionId],
    queryFn: () => fetchRequisitionActivityAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
  });
}
