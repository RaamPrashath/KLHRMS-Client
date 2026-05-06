'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeaveRequestAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveRequestInput } from '@/modules/leave/schema/leaveSchemas';

export function useCreateLeaveRequest(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveRequestInput) => createLeaveRequestAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
