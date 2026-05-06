'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHolidayAction } from '@/modules/leave/api/leaveServerActions';
import type { HolidayInput } from '@/modules/leave/schema/leaveSchemas';

export function useUpdateHoliday(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ holidayId, data }: { holidayId: string; data: HolidayInput }) =>
      updateHolidayAction({ orgSlug, memberId, holidayId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
