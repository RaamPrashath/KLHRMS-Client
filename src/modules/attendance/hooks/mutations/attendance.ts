'use client';

import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  clockInAction,
  clockOutAction,
  deleteAttendanceAction,
  manualAttendanceAction,
} from '@/modules/attendance/api/attendanceServerActions';
import {
  deleteBulkAttendanceDayAction,
  upsertBulkAttendanceAction,
} from '@/modules/attendance/api/bulkAttendanceServerActions';
import { attendanceQueryKeys } from '@/modules/attendance/hooks/queries/attendance';
import type {
  ClockInInput,
  ClockOutInput,
  DeleteDayEntryInput,
  ManualEntryInput,
} from '@/modules/attendance/schema/attendanceSchemas';
import type { ApiError, AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';
import type {
  DeleteBulkAttendanceDayResponse,
  UpsertBulkAttendanceRequest,
  UpsertBulkAttendanceResponse,
} from '@/modules/attendance/types/bulkAttendanceTypes';

interface DeleteVariables {
  orgSlug: string;
  memberId: string;
  targetMemberId: string;
  date: string;
}

export function useClockInMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AttendanceRecord, Error, ClockInInput>({
    mutationFn: (data) => clockInAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['attendance-me', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['bulk-attendance', orgSlug] });
      queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.attendanceToday(orgSlug, memberId),
      });
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

export function useClockOutMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<AttendanceRecord[], Error, ClockOutInput>({
    mutationFn: (data) => clockOutAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['attendance-me', orgSlug] });
      queryClient.invalidateQueries({ queryKey: ['bulk-attendance', orgSlug] });
      queryClient.invalidateQueries({
        queryKey: attendanceQueryKeys.attendanceToday(orgSlug, memberId),
      });
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

export function useUpsertBulkAttendanceMutation(
  orgSlug: string,
  memberId: string,
  queryKey: QueryKey,
) {
  const queryClient = useQueryClient();

  return useMutation<UpsertBulkAttendanceResponse, ApiError, UpsertBulkAttendanceRequest>({
    mutationFn: (data) => upsertBulkAttendanceAction({ orgSlug, memberId, data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteBulkAttendanceDayMutation(
  orgSlug: string,
  memberId: string,
  queryKey: QueryKey,
) {
  const queryClient = useQueryClient();

  return useMutation<DeleteBulkAttendanceDayResponse, ApiError, string>({
    mutationFn: (day) => deleteBulkAttendanceDayAction({ orgSlug, memberId, day }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
