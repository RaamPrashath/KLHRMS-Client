'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAttendanceAction } from '@/modules/attendance/api/attendanceServerActions';
import type { DeleteDayEntryInput } from '@/modules/attendance/schema/attendanceSchemas';

interface DeleteVariables {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
  date: string;
}

export function useDeleteAttendanceMutation(orgSlug: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, DeleteVariables>({
    mutationFn: ({ orgSlug: slug, memberId, targetMemberId, date }) =>
      deleteAttendanceAction({
        orgSlug: slug,
        memberId,
        data: { target_member_id: targetMemberId, date } satisfies DeleteDayEntryInput,
      }),
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
