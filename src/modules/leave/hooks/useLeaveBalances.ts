'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveBalancesAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveBalanceFiltersState, LeaveBalanceListResponse } from '@/modules/leave/types/leaveTypes';

export function useLeaveBalances(
  orgSlug: string,
  memberId: string,
  filters?: LeaveBalanceFiltersState,
) {
  return useQuery<LeaveBalanceListResponse, Error>({
    queryKey: ['leave-balances', orgSlug, filters],
    queryFn: () =>
      fetchLeaveBalancesAction({
        orgSlug,
        memberId,
        filters: {
          memberId: filters?.memberId,
          leaveTypeId: filters?.leaveTypeId,
          year: filters?.year,
          page: filters?.page,
          pageSize: filters?.pageSize,
        },
      }),
    enabled: !!orgSlug && !!memberId,
  });
}
