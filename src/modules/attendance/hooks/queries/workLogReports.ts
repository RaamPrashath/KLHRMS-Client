'use client';

import { useQuery } from '@tanstack/react-query';
import {
  exportWorkLogReportsAction,
  fetchWorkLogReportDetailAction,
  fetchWorkLogReportsAction,
} from '@/modules/attendance/api/workLogReportServerActions';
import type {
  WorkLogReportDetailResponse,
  WorkLogReportFilters,
  WorkLogReportListResponse,
} from '@/modules/attendance/types/workLogReportTypes';

export const workLogReportQueryKeys = {
  list: (orgSlug: string, memberId: string, filters?: WorkLogReportFilters) =>
    ['work-log-reports', orgSlug, memberId, filters] as const,
  detail: (orgSlug: string, memberId: string, attendanceRecordId: string) =>
    ['work-log-report', orgSlug, memberId, attendanceRecordId] as const,
};

export function useWorkLogReportsQuery(
  orgSlug: string,
  memberId: string,
  filters?: WorkLogReportFilters,
) {
  return useQuery<WorkLogReportListResponse, Error>({
    queryKey: workLogReportQueryKeys.list(orgSlug, memberId, filters),
    queryFn: () => fetchWorkLogReportsAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId && filters != null,
    placeholderData: (previous) => previous,
  });
}

export function useWorkLogReportDetailQuery(
  orgSlug: string,
  memberId: string,
  attendanceRecordId: string | null,
) {
  return useQuery<WorkLogReportDetailResponse, Error>({
    queryKey: workLogReportQueryKeys.detail(orgSlug, memberId, attendanceRecordId ?? 'none'),
    queryFn: () =>
      fetchWorkLogReportDetailAction({
        orgSlug,
        memberId,
        attendanceRecordId: attendanceRecordId!,
      }),
    enabled: !!orgSlug && !!memberId && !!attendanceRecordId,
  });
}

export { exportWorkLogReportsAction };
