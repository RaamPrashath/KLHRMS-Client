'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncHolidaysAction } from '@/modules/leave/api/leaveServerActions';

export function useSyncHolidays(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncHolidaysAction({ orgSlug, memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-holidays', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['leave-calendar', orgSlug] });
    },
  });
}
