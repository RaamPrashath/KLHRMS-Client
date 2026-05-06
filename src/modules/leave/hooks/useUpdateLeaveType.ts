'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeaveTypeAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveTypeInput } from '@/modules/leave/schema/leaveSchemas';

export function useUpdateLeaveType(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveTypeId, data }: { leaveTypeId: string; data: LeaveTypeInput }) =>
      updateLeaveTypeAction({ orgSlug, memberId, leaveTypeId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests', orgSlug] });
    },
  });
}
