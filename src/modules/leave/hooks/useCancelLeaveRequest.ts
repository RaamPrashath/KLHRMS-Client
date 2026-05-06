'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelLeaveRequestAction } from '@/modules/leave/api/leaveServerActions';

export function useCancelLeaveRequest(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leaveRequestId: string) => cancelLeaveRequestAction({ orgSlug, memberId, leaveRequestId }),
    onSuccess: (_, leaveRequestId) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-request', orgSlug, leaveRequestId] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
