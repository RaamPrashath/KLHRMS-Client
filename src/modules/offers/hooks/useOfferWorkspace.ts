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
  return useMutation<OfferDispatchCreateResponse, Error, OfferDispatchPayload, { previousWorkspace: OfferStageWorkspace | undefined }>({
    mutationFn: (data) => createOfferDispatchAction({ orgSlug, memberId, jobSlug, stageSlug, data }),
    onMutate: async (payload) => {
      const queryKey = offerWorkspaceKey(orgSlug, jobSlug, stageSlug);
      // Snapshot the current workspace
      const previousWorkspace = queryClient.getQueryData<OfferStageWorkspace>(queryKey);
      if (!previousWorkspace) return { previousWorkspace };

      // Optimistically set dispatched candidates to DRAFT
      const updatedCandidates = previousWorkspace.candidates.map((candidate) => {
        if (payload.applicationIds.includes(candidate.applicationId)) {
          return {
            ...candidate,
            offerStatus: 'DRAFT',
            latestOffer: candidate.latestOffer ?? ({
              id: '',
              organizationId: '',
              applicationId: candidate.applicationId,
              batchId: null,
              templateId: null,
              templateCategoryId: null,
              stageId: null,
              status: 'DRAFT',
              title: '',
              message: null,
              salary: null,
              currency: 'INR',
              joiningDate: null,
              expiresAt: payload.expiresAt ?? null,
              sentAt: null,
              respondedAt: null,
              candidateToken: null,
              pdfUrl: null,
              renderedHtml: null,
              storageBucket: null,
              storagePath: null,
              fileName: null,
              emailSentAt: null,
              emailError: null,
              responseIgnoredAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } satisfies import('@/modules/offers/types/offerTypes').OfferLetter),
          };
        }
        return candidate;
      });

      queryClient.setQueryData<OfferStageWorkspace>(queryKey, {
        ...previousWorkspace,
        candidates: updatedCandidates,
      });

      return { previousWorkspace };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousWorkspace) {
        const queryKey = offerWorkspaceKey(orgSlug, jobSlug, stageSlug);
        queryClient.setQueryData<OfferStageWorkspace>(queryKey, context.previousWorkspace);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerWorkspaceKey(orgSlug, jobSlug, stageSlug) });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}
