'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchApplicationOfferLettersAction } from '@/modules/offers/api/offerServerActions';
import type { OfferApplicationLetters } from '@/modules/offers/types/offerTypes';

export function useOfferApplicationLetters(
  orgSlug: string,
  memberId: string,
  applicationId: string | null,
) {
  return useQuery<OfferApplicationLetters, Error>({
    queryKey: ['offer-application-letters', orgSlug, applicationId ?? 'none'],
    queryFn: () =>
      fetchApplicationOfferLettersAction({
        orgSlug,
        memberId,
        applicationId: applicationId ?? '',
      }),
    enabled: !!orgSlug && !!memberId && !!applicationId,
  });
}
