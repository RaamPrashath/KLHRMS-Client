'use client';

import { useQuery } from '@tanstack/react-query';
import type { RefetchOptions } from '@tanstack/react-query';
import {
  fetchAttendance,
  fetchMyAttendance,
} from '@/hooks/functions/attendance';
import {
  fetchAttendanceClockContextAction,
  fetchAttendanceClockWidgetAction,
  fetchMemberPermissionsAction,
  fetchMemberProfileAction,
} from '@/modules/attendance/api/attendanceServerActions';
import { fetchBulkAttendanceRangeAction } from '@/modules/attendance/api/bulkAttendanceServerActions';
import { resolveAttendancePermissions } from '@/modules/attendance/utils/attendancePermissions';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import type {
  AttendanceClockContext,
  AttendanceClockWidgetData,
  AttendanceFiltersState,
  AttendanceListResponse,
  AttendancePermissions,
  AttendanceRecord,
  PermissionScope,
} from '@/modules/attendance/types/attendanceTypes';
import type { GetBulkAttendanceRangeResponse } from '@/modules/attendance/types/bulkAttendanceTypes';

export const attendanceQueryKeys = {
  attendance: (
    mode: string,
    scope: 'organization' | 'self',
    pageIndex: number | undefined,
    orgSlug: string,
    memberId: string,
    filters?: Partial<AttendanceFiltersState>,
  ) =>
    [
      'attendance',
      mode,
      pageIndex,
      filters?.pageSize,
      scope,
      orgSlug,
      memberId,
      {
        targetMemberId: filters?.targetMemberId,
        employeeNameSearch: filters?.employeeNameSearch,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        status: filters?.status,
        timePreset: filters?.timePreset,
      },
    ] as const,
  attendanceToday: (orgSlug: string, memberId: string) =>
    ['attendance-today', orgSlug, memberId] as const,
  memberPermissions: (orgSlug: string, memberId: string) =>
    ['member-permissions', orgSlug, memberId] as const,
  memberProfile: (memberId: string) => ['member-profile', memberId] as const,
  attendanceClockContext: (orgSlug: string, memberId: string, date: string) =>
    ['attendance-clock-context', orgSlug, memberId, date] as const,
  attendanceClockWidget: (orgSlug: string, memberId: string, date: string) =>
    ['attendance-clock-widget', orgSlug, memberId, date] as const,
  bulkAttendance: (orgSlug: string, from: string, to: string) =>
    ['bulk-attendance', orgSlug, from, to] as const,
};

export function useAttendanceQuery(
  orgSlug: string,
  memberId: string,
  filters?: Partial<AttendanceFiltersState>,
  options?: { enabled?: boolean; staleTime?: number; mode?: string; pageIndex?: number },
): {
  data: AttendanceListResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => void;
} {
  const query = useQuery<AttendanceListResponse, Error>({
    queryKey: attendanceQueryKeys.attendance(
      options?.mode ?? 'list',
      'organization',
      options?.pageIndex,
      orgSlug,
      memberId,
      filters,
    ),
    queryFn: () => {
      console.info('[attendance-pagination] api-request', {
        mode: options?.mode ?? 'list',
        scope: 'organization',
        apiRequestPage: filters?.page,
        apiRequestPageSize: filters?.pageSize,
      });
      return fetchAttendance(
        { orgSlug, memberId },
        {
          target_member_id: filters?.targetMemberId,
          employee_name: filters?.employeeNameSearch,
          date_from: filters?.dateFrom,
          date_to: filters?.dateTo,
          status: filters?.status,
          page: filters?.page,
          page_size: filters?.pageSize,
        },
      );
    },
    enabled: !!orgSlug && !!memberId && (options?.enabled ?? true),
    staleTime: options?.staleTime,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMyAttendanceQuery(
  orgSlug: string,
  memberId: string,
  filters?: Partial<AttendanceFiltersState>,
  options?: { enabled?: boolean; staleTime?: number; mode?: string; pageIndex?: number },
): {
  data: AttendanceListResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => void;
} {
  const query = useQuery<AttendanceListResponse, Error>({
    queryKey: attendanceQueryKeys.attendance(
      options?.mode ?? 'list',
      'self',
      options?.pageIndex,
      orgSlug,
      memberId,
      filters,
    ),
    queryFn: () => {
      console.info('[attendance-pagination] api-request', {
        mode: options?.mode ?? 'list',
        scope: 'self',
        apiRequestPage: filters?.page,
        apiRequestPageSize: filters?.pageSize,
      });
      return fetchMyAttendance(
        { orgSlug, memberId },
        {
          date_from: filters?.dateFrom,
          date_to: filters?.dateTo,
          status: filters?.status,
          page: filters?.page,
          page_size: filters?.pageSize,
        },
      );
    },
    enabled: !!orgSlug && !!memberId && (options?.enabled ?? true),
    staleTime: options?.staleTime,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAttendanceTodayQuery(orgSlug: string, memberId: string, todayIso: string) {
  return useQuery<AttendanceListResponse, Error>({
    queryKey: attendanceQueryKeys.attendanceToday(orgSlug, memberId),
    queryFn: () =>
      fetchMyAttendance(
        { orgSlug, memberId },
        {
          date_from: todayIso,
          date_to: todayIso,
          page: 1,
          page_size: 1,
        },
      ),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useMemberPermissionsQuery(orgSlug: string, memberId: string) {
  return useQuery<Record<string, Record<string, string>>>({
    queryKey: attendanceQueryKeys.memberPermissions(orgSlug, memberId),
    queryFn: () => fetchMemberPermissionsAction({ orgSlug, memberId }),
    staleTime: 60_000,
  });
}

export function useMemberProfileQuery(memberId: string) {
  return useQuery<{ name: string | null }>({
    queryKey: attendanceQueryKeys.memberProfile(memberId),
    queryFn: () => fetchMemberProfileAction({ memberId }),
    enabled: !!memberId,

  });
}

export function useAttendanceClockContextQuery(
  orgSlug: string,
  memberId: string,
  todayIso: string,
) {
  return useQuery<AttendanceClockContext, Error>({
    queryKey: attendanceQueryKeys.attendanceClockContext(orgSlug, memberId, todayIso),
    queryFn: () =>
      fetchAttendanceClockContextAction({
        orgSlug,
        memberId,
        date: todayIso,
      }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useAttendanceClockWidgetQuery(
  orgSlug: string,
  memberId: string,
  todayIso: string,
) {
  return useQuery<AttendanceClockWidgetData, Error>({
    queryKey: attendanceQueryKeys.attendanceClockWidget(orgSlug, memberId, todayIso),
    queryFn: () =>
      fetchAttendanceClockWidgetAction({
        orgSlug,
        memberId,
        date: todayIso,
      }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
  });
}

export function useBulkAttendanceRangeQuery(
  orgSlug: string,
  memberId: string,
  from: string,
  to: string,
) {
  return useQuery<GetBulkAttendanceRangeResponse, Error>({
    queryKey: attendanceQueryKeys.bulkAttendance(orgSlug, from, to),
    queryFn: () => fetchBulkAttendanceRangeAction({ orgSlug, memberId, from, to }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function canUseBulkAttendance(createScope: PermissionScope): boolean {
  return (
    createScope === 'self' ||
    createScope === 'department' ||
    createScope === 'organization'
  );
}

export interface UseBulkAttendancePermissionsReturn {
  permissions: AttendancePermissions;
  canCreate: boolean;
  canView: boolean;
  canDelete: boolean;
  isLoading: boolean;
}

export function useBulkAttendancePermissions(
  orgSlug: string,
  memberId: string,
): UseBulkAttendancePermissionsReturn {
  const { data: rawPermissions, isLoading } = useMemberPermissionsQuery(orgSlug, memberId);
  const permissions = resolveAttendancePermissions(rawPermissions ?? {});

  return {
    permissions,
    canCreate: canUseBulkAttendance(permissions.create),
    canView: canUseBulkAttendance(permissions.view),
    canDelete: canUseBulkAttendance(permissions.delete),
    isLoading,
  };
}

export function findTodayRecord(records: AttendanceRecord[]): AttendanceRecord | null {
  const todayIST = getTodayIST();
  return records.find((record) => record.date === todayIST) ?? null;
}
