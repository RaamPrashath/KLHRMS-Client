'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequestsAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveRequestFiltersState, LeaveRequestListResponse } from '@/modules/leave/types/leaveTypes';

export function useLeaveRequests(
  orgSlug: string,
  memberId: string,
  filters: LeaveRequestFiltersState,
) {
  return useQuery<LeaveRequestListResponse, Error>({
    queryKey: ['leave-requests', orgSlug, filters],
    queryFn: () =>
      fetchLeaveRequestsAction({
        orgSlug,
        memberId,
        filters: {
          status: filters.status,
          memberId: filters.memberId,
          leaveTypeId: filters.leaveTypeId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          year: filters.year,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      }),
    enabled: !!orgSlug && !!memberId,
  });
}
