'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveSummaryAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveSummaryListResponse } from '@/modules/leave/types/leaveTypes';

export function useLeaveSummary(orgSlug: string, memberId: string) {
  const query = useQuery<LeaveSummaryListResponse, Error>({
    queryKey: ['leave-summary', orgSlug],
    queryFn: () =>
      fetchLeaveSummaryAction({
        orgSlug,
        memberId,
      }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (prev) => prev,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
