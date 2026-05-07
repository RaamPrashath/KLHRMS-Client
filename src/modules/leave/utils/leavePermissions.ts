import type { LeavePermissionScope, LeavePermissions } from '@/modules/leave/types/leaveTypes';

function normalizeScope(value: string | undefined): LeavePermissionScope {
  if (value === 'org') return 'organization';
  if (value === 'self' || value === 'organization' || value === 'team' || value === 'department') {
    return value;
  }
  return 'none';
}

export function resolveLeavePermissions(
  rolePermissions: Record<string, Record<string, string>>,
): LeavePermissions {
  const leavePermissions = rolePermissions.leaves ?? {};
  return {
    view: normalizeScope(leavePermissions.view),
    create: normalizeScope(leavePermissions.create),
    approve: normalizeScope(leavePermissions.approve),
  };
}

export function canViewLeaves(scope: LeavePermissionScope): boolean {
  return scope === 'self' || scope === 'organization';
}

export function canCreateLeaves(scope: LeavePermissionScope): boolean {
  return scope === 'self' || scope === 'organization';
}

export function canApproveLeaves(scope: LeavePermissionScope): boolean {
  return scope === 'organization';
}

export function canSyncHolidays(scope: LeavePermissionScope): boolean {
  return scope === 'organization';
}
