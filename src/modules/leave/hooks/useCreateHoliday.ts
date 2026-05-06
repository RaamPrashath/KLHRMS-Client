'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHolidayAction } from '@/modules/leave/api/leaveServerActions';
import type { HolidayInput } from '@/modules/leave/schema/leaveSchemas';

export function useCreateHoliday(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: HolidayInput) => createHolidayAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
