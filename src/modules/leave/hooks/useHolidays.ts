'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHolidaysAction } from '@/modules/leave/api/leaveServerActions';
import type { HolidayRecord } from '@/modules/leave/types/leaveTypes';

/**
 * Fetches holidays for the sidebar calendar (single month, no pagination UI).
 * Returns a flat HolidayRecord[] for backwards compatibility with the calendar.
 */
export function useHolidays(
  orgSlug: string,
  memberId: string,
  filters?: { year?: number; month?: number },
) {
  return useQuery<HolidayRecord[], Error>({
    queryKey: ['leave-holidays', orgSlug, filters?.year, filters?.month],
    queryFn: async () => {
      const res = await fetchHolidaysAction({
        orgSlug,
        memberId,
        year: filters?.year,
        month: filters?.month,
        pageSize: 200, // calendar only needs current month — 200 is a safe ceiling
      });
      return res.items;
    },
    enabled: !!orgSlug && !!memberId,
  });
}
