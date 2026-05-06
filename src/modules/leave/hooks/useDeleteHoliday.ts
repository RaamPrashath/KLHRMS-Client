'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteHolidayAction } from '@/modules/leave/api/leaveServerActions';

export function useDeleteHoliday(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (holidayId: string) => deleteHolidayAction({ orgSlug, memberId, holidayId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
