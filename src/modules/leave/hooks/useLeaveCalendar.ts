'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveCalendarAction } from '@/modules/leave/api/leaveServerActions';
import type { LeaveCalendarResponse } from '@/modules/leave/types/leaveTypes';

export function useLeaveCalendar(
  orgSlug: string,
  memberId: string,
  year: number,
  month: number,
) {
  return useQuery<LeaveCalendarResponse, Error>({
    queryKey: ['leave-calendar', orgSlug, year, month],
    queryFn: () => fetchLeaveCalendarAction({ orgSlug, memberId, year, month }),
    enabled: !!orgSlug && !!memberId,
  });
}
