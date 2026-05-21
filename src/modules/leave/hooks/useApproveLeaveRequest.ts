'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveLeaveRequestAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveDecisionInput } from '@/modules/leave/schema/leaveSchemas';

export function useApproveLeaveRequest(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveRequestId, data }: { leaveRequestId: string; data: LeaveDecisionInput }) =>
      approveLeaveRequestAction({ orgSlug, memberId, leaveRequestId, data }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leave-requests', orgSlug] }),
        queryClient.invalidateQueries({ queryKey: ['leave-request', orgSlug, variables.leaveRequestId] }),
        queryClient.invalidateQueries({ queryKey: ['leave-balances', orgSlug] }),
        queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] }),
      ]);
      await queryClient.refetchQueries({ queryKey: ['leave-balances', orgSlug], type: 'active' });
    },
  });
}
