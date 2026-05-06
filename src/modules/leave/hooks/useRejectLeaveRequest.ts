'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectLeaveRequestAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveDecisionInput } from '@/modules/leave/schema/leaveSchemas';

export function useRejectLeaveRequest(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveRequestId, data }: { leaveRequestId: string; data: LeaveDecisionInput }) =>
      rejectLeaveRequestAction({ orgSlug, memberId, leaveRequestId, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-request', orgSlug, variables.leaveRequestId] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
