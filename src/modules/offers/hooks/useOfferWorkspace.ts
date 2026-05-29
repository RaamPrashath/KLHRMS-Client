'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createOfferDispatchAction,
  fetchOfferWorkspaceAction,
  validateOfferDispatchAction,
} from '@/modules/offers/api/offerServerActions';
import type { OfferDispatchPayload } from '@/modules/offers/schema/offerSchemas';
import type {
  OfferCandidateValidationResponse,
  OfferDispatchCreateResponse,
  OfferStageWorkspace,
} from '@/modules/offers/types/offerTypes';

export function offerWorkspaceKey(orgSlug: string, jobSlug: string | null, stageSlug: string | null) {
  return ['offer-workspace', orgSlug, jobSlug ?? 'none', stageSlug ?? 'none'] as const;
}

export function useOfferWorkspace(
  orgSlug: string,
  memberId: string,
  jobSlug: string | null,
  stageSlug: string | null,
  initialData?: OfferStageWorkspace,
) {
  return useQuery<OfferStageWorkspace, Error>({
    queryKey: offerWorkspaceKey(orgSlug, jobSlug, stageSlug),
    queryFn: () =>
      fetchOfferWorkspaceAction({
        orgSlug,
        memberId,
        jobSlug: jobSlug ?? '',
        stageSlug: stageSlug ?? '',
      }),
    enabled: !!orgSlug && !!memberId && !!jobSlug && !!stageSlug,
    initialData,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useValidateOfferDispatch(
  orgSlug: string,
  memberId: string,
  jobSlug: string,
  stageSlug: string,
) {
  return useMutation<OfferCandidateValidationResponse, Error, OfferDispatchPayload>({
    mutationFn: (data) => validateOfferDispatchAction({ orgSlug, memberId, jobSlug, stageSlug, data }),
  });
}

export function useCreateOfferDispatch(
  orgSlug: string,
  memberId: string,
  jobSlug: string,
  stageSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation<OfferDispatchCreateResponse, Error, OfferDispatchPayload>({
    mutationFn: (data) => createOfferDispatchAction({ orgSlug, memberId, jobSlug, stageSlug, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerWorkspaceKey(orgSlug, jobSlug, stageSlug) });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}
