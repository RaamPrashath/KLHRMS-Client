'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clockOutAction } from '@/modules/attendance/api/attendanceServerActions';
import type { ClockOutInput } from '@/modules/attendance/schema/attendanceSchemas';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

export function useClockOutMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AttendanceRecord[], Error, ClockOutInput>({
    mutationFn: (data) => clockOutAction({ orgSlug, memberId, data }),
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
