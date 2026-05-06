'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveTypesAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';

export function useLeaveTypes(orgSlug: string, memberId: string) {
  return useQuery<LeaveTypeRecord[], Error>({
    queryKey: ['leave-types', orgSlug],
    queryFn: () => fetchLeaveTypesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}
