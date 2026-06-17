'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequests } from '@/hooks/functions/leave';
import type { LeaveRequestFiltersState, LeaveRequestListResponse } from '@/modules/leave/types/leaveTypes';

export function useLeaveRequests(
  orgSlug: string,
  memberId: string,
  filters: LeaveRequestFiltersState,
  options?: { enabled?: boolean; keepPreviousData?: boolean; staleTime?: number },
) {
  return useQuery<LeaveRequestListResponse, Error>({
    queryKey: ['leave-requests', orgSlug, filters],
    queryFn: () =>
      fetchLeaveRequests(
        { orgSlug, memberId },
        {
          status: filters.status,
          memberId: filters.memberId,
          leaveTypeId: filters.leaveTypeId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          year: filters.year,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      ),
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    placeholderData: options?.keepPreviousData ? (previousData) => previousData : undefined,
    staleTime: options?.staleTime,
  });
}
