'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAttendanceReportAction,
  fetchAttendanceReportOptionsAction,
} from '@/modules/attendance-report/api';
import type {
  AttendanceReportFilters,
  AttendanceReportListResponse,
  AttendanceReportOptionsResponse,
} from '@/modules/attendance-report/types';

export const attendanceReportQueryKeys = {
  options: (orgSlug: string, memberId: string) => ['attendance-report-options', orgSlug, memberId] as const,
  list: (orgSlug: string, memberId: string, filters: AttendanceReportFilters) =>
    ['attendance-report', orgSlug, memberId, filters] as const,
};

export function useAttendanceReportOptionsQuery(
  orgSlug: string,
  memberId: string,
  enabled: boolean,
) {
  return useQuery<AttendanceReportOptionsResponse, Error>({
    queryKey: attendanceReportQueryKeys.options(orgSlug, memberId),
    queryFn: () => fetchAttendanceReportOptionsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && enabled,
    staleTime: 60_000,
  });
}

export function useAttendanceReportQuery(
  orgSlug: string,
  memberId: string,
  filters: AttendanceReportFilters,
  enabled: boolean,
) {
  return useQuery<AttendanceReportListResponse, Error>({
    queryKey: attendanceReportQueryKeys.list(orgSlug, memberId, filters),
    queryFn: () => fetchAttendanceReportAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId && enabled,
    placeholderData: (previous) => previous,
  });
}
