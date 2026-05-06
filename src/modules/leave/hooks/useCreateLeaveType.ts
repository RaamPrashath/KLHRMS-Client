'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeaveTypeAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveTypeInput } from '@/modules/leave/schema/leaveSchemas';

export function useCreateLeaveType(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveTypeInput) => createLeaveTypeAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types', orgSlug] });
    },
  });
}
