import type {
  PermissionScope,
  AttendancePermissions,
} from '@/modules/attendance/types/attendanceTypes';

export function isOperativeScope(scope: PermissionScope | null | undefined): boolean {
  return scope === 'self' || scope === 'organization';
}

export function resolveAttendancePermissions(
  rolePermissions: Record<string, Record<string, string>>,
): AttendancePermissions {
  const attendance = rolePermissions['attendance'] ?? {};
  const toScope = (val: string | undefined): PermissionScope => {
    const valid: PermissionScope[] = ['none', 'self', 'team', 'department', 'organization'];
    return valid.includes(val as PermissionScope) ? (val as PermissionScope) : 'none';
  };
  return {
    view: toScope(attendance['view']),
    create: toScope(attendance['create']),
    edit: toScope(attendance['edit']),
    delete: toScope(attendance['delete']),
  };
}
