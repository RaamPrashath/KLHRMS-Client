'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMemberPermissionsAction } from '@/modules/attendance/api/attendanceServerActions';
import { resolveAttendancePermissions } from '@/modules/attendance/utils/attendancePermissions';
import type { AttendancePermissions, PermissionScope } from '@/modules/attendance/types/attendanceTypes';

/**
 * Returns true if the scope allows self-service bulk attendance.
 * Any non-none scope that includes self access is valid.
 */
export function canUseBulkAttendance(createScope: PermissionScope): boolean {
  return createScope === 'self' || createScope === 'team' || createScope === 'department' || createScope === 'organization';
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
  const { data: rawPermissions, isLoading } = useQuery({
    queryKey: ['member-permissions', orgSlug, memberId],
    queryFn: () => fetchMemberPermissionsAction({ orgSlug, memberId }),
    staleTime: 60_000,
  });

  const permissions = resolveAttendancePermissions(rawPermissions ?? {});

  return {
    permissions,
    canCreate: canUseBulkAttendance(permissions.create),
    canView: canUseBulkAttendance(permissions.view),
    canDelete: canUseBulkAttendance(permissions.delete),
    isLoading,
  };
}
