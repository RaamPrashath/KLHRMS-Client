'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequestAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveRequestRecord } from '@/modules/leave/types/leaveTypes';

export function useLeaveRequest(
  orgSlug: string,
  memberId: string,
  leaveRequestId: string | null,
) {
  return useQuery<LeaveRequestRecord, Error>({
    queryKey: ['leave-request', orgSlug, leaveRequestId],
    queryFn: () => fetchLeaveRequestAction({ orgSlug, memberId, leaveRequestId: leaveRequestId! }),
    enabled: !!orgSlug && !!memberId && !!leaveRequestId,
  });
}
