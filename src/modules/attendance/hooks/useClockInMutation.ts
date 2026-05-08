'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clockInAction } from '@/modules/attendance/api/attendanceServerActions';
import type { ClockInInput } from '@/modules/attendance/schema/attendanceSchemas';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

export function useClockInMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AttendanceRecord, Error, ClockInInput>({
    mutationFn: (data) => clockInAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['attendance-me', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today', orgSlug, memberId] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
  };
}
