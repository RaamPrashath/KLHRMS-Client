'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHolidaysAction } from '@/modules/leave/api/leaveServerActions';
import type { HolidayRecord } from '@/modules/leave/types/leaveTypes';

export function useHolidays(
  orgSlug: string,
  memberId: string,
  filters?: { year?: number; month?: number },
) {
  return useQuery<HolidayRecord[], Error>({
    queryKey: ['leave-holidays', orgSlug, filters?.year, filters?.month],
    queryFn: () => fetchHolidaysAction({ orgSlug, memberId, year: filters?.year, month: filters?.month }),
    enabled: !!orgSlug && !!memberId,
  });
}
