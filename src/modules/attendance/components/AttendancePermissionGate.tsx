'use client';

import { isOperativeScope } from '@/modules/attendance/utils/attendancePermissions';
import type { PermissionScope } from '@/modules/attendance/types/attendanceTypes';

interface AttendancePermissionGateProps {
  scope: PermissionScope | null | undefined;
  children: React.ReactNode;
}

export function AttendancePermissionGate({
  scope,
  children,
}: Readonly<AttendancePermissionGateProps>) {
  if (!isOperativeScope(scope)) return null;
  return <>{children}</>;
}
