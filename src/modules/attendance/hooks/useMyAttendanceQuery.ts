'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyAttendanceAction } from '@/modules/attendance/api/attendanceServerActions';
import type {
  AttendanceListResponse,
  AttendanceFiltersState,
} from '@/modules/attendance/types/attendanceTypes';

export function useMyAttendanceQuery(
  orgSlug: string,
  memberId: string,
  filters?: Partial<AttendanceFiltersState>,
): {
  data: AttendanceListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<AttendanceListResponse, Error>({
    queryKey: ['attendance-me', orgSlug, memberId, filters],
    queryFn: () =>
      fetchMyAttendanceAction({
        orgSlug,
        memberId,
        filters: {
          date_from: filters?.dateFrom,
          date_to: filters?.dateTo,
          status: filters?.status,
          page: filters?.page,
          page_size: filters?.pageSize,
        },
      }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
