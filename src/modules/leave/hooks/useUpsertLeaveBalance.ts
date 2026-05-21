'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertLeaveBalanceAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveBalanceAssignmentInput } from '@/modules/leave/schema/leaveSchemas';

export function useUpsertLeaveBalance(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveBalanceAssignmentInput) =>
      upsertLeaveBalanceAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances', orgSlug] });
    },
  });
}
