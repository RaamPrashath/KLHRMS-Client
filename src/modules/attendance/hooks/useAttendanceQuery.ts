'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAttendanceAction } from '@/modules/attendance/api/attendanceServerActions';
import type {
  AttendanceListResponse,
  AttendanceFiltersState,
} from '@/modules/attendance/types/attendanceTypes';

export function useAttendanceQuery(
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
    queryKey: ['attendance', orgSlug, filters],
    queryFn: () =>
      fetchAttendanceAction({
        orgSlug,
        memberId,
        filters: {
          target_member_id: filters?.targetMemberId,
          employee_name: filters?.employeeNameSearch,
          date_from: filters?.dateFrom,
          date_to: filters?.dateTo,
          status: filters?.status,
          page: filters?.page,
          page_size: filters?.pageSize,
        },
      }),
    enabled: !!orgSlug && !!memberId,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
