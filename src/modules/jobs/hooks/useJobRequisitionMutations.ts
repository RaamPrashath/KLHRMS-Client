'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  approveJobRequisitionAction,
  closeJobRequisitionAction,
  createJobRequisitionAction,
  rejectJobRequisitionAction,
  submitJobRequisitionAction,
} from '@/modules/jobs/api/jobRequisitionServerActions';
import type {
  CreateJobRequisitionInput,
  JobRequisitionDecisionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';

function invalidateJobs(queryClient: ReturnType<typeof useQueryClient>, orgSlug: string) {
  queryClient.invalidateQueries({ queryKey: ['job-requisitions', orgSlug] });
}

export function useCreateJobRequisition(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobRequisitionInput) =>
      createJobRequisitionAction({ orgSlug, memberId, data }),
    onSuccess: () => invalidateJobs(queryClient, orgSlug),
  });
}

export function useSubmitJobRequisition(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requisitionId: string) =>
      submitJobRequisitionAction({ orgSlug, memberId, requisitionId }),
    onSuccess: () => invalidateJobs(queryClient, orgSlug),
  });
}

export function useApproveJobRequisition(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { requisitionId: string; data: JobRequisitionDecisionInput }) =>
      approveJobRequisitionAction({ orgSlug, memberId, ...params }),
    onSuccess: () => invalidateJobs(queryClient, orgSlug),
  });
}

export function useRejectJobRequisition(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { requisitionId: string; data: JobRequisitionDecisionInput }) =>
      rejectJobRequisitionAction({ orgSlug, memberId, ...params }),
    onSuccess: () => invalidateJobs(queryClient, orgSlug),
  });
}

export function useCloseJobRequisition(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requisitionId: string) =>
      closeJobRequisitionAction({ orgSlug, memberId, requisitionId }),
    onSuccess: () => invalidateJobs(queryClient, orgSlug),
  });
}
