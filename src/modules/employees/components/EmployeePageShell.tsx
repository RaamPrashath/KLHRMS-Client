'use client';

import { useState, useCallback, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { useDeactivateEmployeeMutation, useEmployeesQuery, useEmployeeRolesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { DeactivateEmployeeDialog } from './DeactivateEmployeeDialog';
import { EmployeeTable } from './EmployeeTable';
import { updateEmployeeRoleAction } from '@/app/actions/organizationActions';
import type { AttendanceTodayStatus } from '@/modules/employees/types/employeeTypes';

interface EmployeePageShellProps {
  orgSlug: string;
  memberId: string;
  permissions: RolePermissions | null;
}

export function EmployeePageShell({ orgSlug, memberId, permissions }: Readonly<EmployeePageShellProps>) {
  const [, startTransition] = useTransition();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceTodayStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Role editing ───────────────────────────────────────────────────────────
  const queryClient = useQueryClient();

  const [deactivateTarget, setDeactivateTarget] = useState<{ memberId: string; name: string } | null>(null);
  const deactivateMutation = useDeactivateEmployeeMutation(orgSlug, memberId);

  const canEditRole = permissions ? getScope(permissions, 'employees', 'edit') !== 'none' : false;

  const handleUpdateRole = useCallback(
    async (targetMemberId: string, newRoleId: string) => {
      const formData = new FormData();
      formData.append('memberId', targetMemberId);
      formData.append('roleId', newRoleId);

      const promise = updateEmployeeRoleAction(orgSlug, formData).then(
        async (result) => {
          if (result.success) {
            await queryClient.invalidateQueries({ queryKey: ['employees', orgSlug] });
            return 'Employee role updated';
          } else {
            throw new Error(result.error ?? 'Failed to update role');
          }
        }
      );

      toast.promise(promise, {
        loading: 'Updating role...',
        success: (data) => data,
        error: (err) => err.message,
      });
    },
    [orgSlug, queryClient],
  );

  const handleDeactivate = useCallback((targetMemberId: string, name: string) => {
    setDeactivateTarget({ memberId: targetMemberId, name });
  }, []);

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useEmployeesQuery(orgSlug, memberId, {
    search: search || undefined,
    roleId,
    attendanceStatus,
    page,
    pageSize,
  });

  const { data: roles = [] } = useEmployeeRolesQuery(orgSlug, memberId);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const handleRoleChange = useCallback((value: string | undefined) => {
    startTransition(() => {
      setRoleId(value);
      setPage(1);
    });
  }, []);

  const handleAttendanceStatusChange = useCallback((value: AttendanceTodayStatus | undefined) => {
    startTransition(() => {
      setAttendanceStatus(value);
      setPage(1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    startTransition(() => {
      setSearch('');
      setRoleId(undefined);
      setAttendanceStatus(undefined);
      setPage(1);
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => setPage(newPage));
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    startTransition(() => {
      setPageSize(newSize);
      setPage(1);
    });
  }, []);

  if (isError) {
    let message = 'Failed to load employees.';
    try {
      const parsed = JSON.parse(error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-100 bg-surface p-8">
        <p className="text-sm text-destructive-text">{message}</p>
      </div>
    );
  }

  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight ml-7 mt-7">Employees</h1>
      <EmployeeTable
        data={items}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        search={search}
        roleId={roleId}
        attendanceStatus={attendanceStatus}
        roles={roles}
        onSearchChange={handleSearchChange}
        onRoleChange={handleRoleChange}
        onAttendanceStatusChange={handleAttendanceStatusChange}
        onClearAll={handleClearAll}
        canEditRole={canEditRole}
        onUpdateRole={handleUpdateRole}
        onDeactivate={canEditRole ? handleDeactivate : undefined}
      />

      <DeactivateEmployeeDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        employeeName={deactivateTarget?.name ?? ''}
        employeeMemberId={deactivateTarget?.memberId ?? ''}
        deactivateMutation={deactivateMutation}
      />
    </div>
  );
}
