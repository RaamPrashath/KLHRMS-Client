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

  // Normalize short-form "org" (stored in DB) to canonical "organization"
  const normalize = (val: string | undefined): string | undefined =>
    val === 'org' ? 'organization' : val;

  const toScope = (val: string | undefined): PermissionScope => {
    const valid: PermissionScope[] = ['none', 'self', 'department', 'organization'];
    const normalized = normalize(val);
    return valid.includes(normalized as PermissionScope) ? (normalized as PermissionScope) : 'none';
  };

  return {
    view: toScope(attendance['view']),
    create: toScope(attendance['create']),
    edit: toScope(attendance['edit']),
    delete: toScope(attendance['delete']),
  };
}
