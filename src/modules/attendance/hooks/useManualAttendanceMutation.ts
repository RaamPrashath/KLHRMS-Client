'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { manualAttendanceAction } from '@/modules/attendance/api/attendanceServerActions';
import type { ManualEntryInput } from '@/modules/attendance/schema/attendanceSchemas';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

export function useManualAttendanceMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AttendanceRecord, Error, ManualEntryInput>({
    mutationFn: (data) => manualAttendanceAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['attendance-me', orgSlug] });
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
