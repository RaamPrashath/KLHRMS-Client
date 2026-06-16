'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHolidays } from '@/hooks/functions/leave';
import type { HolidayRecord } from '@/modules/leave/types/leaveTypes';

/**
 * Fetches holidays for the sidebar calendar (single month, no pagination UI).
 * Returns a flat HolidayRecord[] for backwards compatibility with the calendar.
 */
export function useHolidays(
  orgSlug: string,
  memberId: string,
  filters?: { year?: number; month?: number },
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery<HolidayRecord[], Error>({
    queryKey: ['leave-holidays', orgSlug, filters?.year, filters?.month],
    queryFn: async () => {
      const res = await fetchHolidays(
        { orgSlug, memberId },
        { year: filters?.year, month: filters?.month, pageSize: 200 },
      );
      return res.items;
    },
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    staleTime: options?.staleTime,
  });
}
