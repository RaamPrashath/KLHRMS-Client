'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import {
  useAttendanceQuery,
  useMyAttendanceQuery,
} from '@/modules/attendance/hooks/queries/attendance';
import { useDeleteAttendanceMutation } from '@/modules/attendance/hooks/mutations/attendance';
import { AttendancePermissionGate } from '@/modules/attendance/components/AttendancePermissionGate';
import { AttendanceTable, type AttendanceRouteMode } from '@/modules/attendance/components/AttendanceTable';
import { ManualAttendanceForm } from '@/modules/attendance/components/ManualAttendanceForm';
import { useAttendanceRouteContext } from '@/modules/attendance/components/AttendanceRouteContext';
import {
  isOperativeScope,
} from '@/modules/attendance/utils/attendancePermissions';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {
  ApiError,
  AttendanceFiltersState,
  AttendanceRecord,
} from '@/modules/attendance/types/attendanceTypes';

interface AttendancePageShellProps {
  mode: AttendanceRouteMode;
  pageIndex: number;
  pageSize: number;
}

type AttendanceNonPaginationFilters = Omit<AttendanceFiltersState, 'page' | 'pageSize'>;

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeekIST(): Date {
  const parts = getTodayIST().split('-').map(Number);
  const today = new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const dow = today.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  today.setDate(today.getDate() - offset);
  return today;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function getMonthStartIST(): Date {
  const parts = getTodayIST().split('-').map(Number);
  return new Date(parts[0]!, (parts[1] ?? 1) - 1, 1);
}

function buildDefaultFilters(selfScope: boolean): AttendanceNonPaginationFilters {
  if (selfScope) {
    const monday = getMondayOfWeekIST();
    return {
      timePreset: 'this_week',
      dateFrom: toYmdLocal(monday),
      dateTo: getTodayIST(),
      status: undefined,
      targetMemberId: undefined,
      employeeNameSearch: undefined,
    };
  }

  return {
    timePreset: 'all_time',
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
    targetMemberId: undefined,
    employeeNameSearch: undefined,
  };
}

function buildRouteFilters(
  mode: AttendanceRouteMode,
  selfScope: boolean,
): AttendanceNonPaginationFilters {
  if (mode === 'weekly') {
    const monday = getMondayOfWeekIST();
    return {
      ...buildDefaultFilters(selfScope),
      timePreset: 'custom',
      dateFrom: toYmdLocal(monday),
      dateTo: toYmdLocal(addDays(monday, 6)),
    };
  }
  if (mode === 'monthly') {
    const monthStart = getMonthStartIST();
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    return {
      ...buildDefaultFilters(selfScope),
      timePreset: 'custom',
      dateFrom: toYmdLocal(monthStart),
      dateTo: toYmdLocal(monthEnd),
    };
  }
  return buildDefaultFilters(selfScope);
}

function sameNonPaginationFilters(
  left: AttendanceNonPaginationFilters,
  right: AttendanceNonPaginationFilters,
) {
  return (
    left.timePreset === right.timePreset &&
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo &&
    left.status === right.status &&
    left.targetMemberId === right.targetMemberId &&
    left.employeeNameSearch === right.employeeNameSearch
  );
}

export function AttendancePageShell({
  mode,
  pageIndex,
  pageSize,
}: Readonly<AttendancePageShellProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orgSlug, memberId, permissions } = useAttendanceRouteContext();
  const isOrgScope = permissions.view === 'organization';
  const isOperative = isOperativeScope(permissions.view) && !isOrgScope;
  const queryPage = pageIndex + 1;

  const [filters, setFilters] = useState<AttendanceNonPaginationFilters>(() =>
    buildRouteFilters(mode, isOperative),
  );
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [manualFormOpen, setManualFormOpen] = useState(false);

  function replacePagination(nextPageIndex: number, nextPageSize = pageSize) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(Math.max(0, nextPageIndex)));
    params.set('pageSize', String(nextPageSize));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleFiltersChange(nextFilters: AttendanceFiltersState) {
    const nextNonPaginationFilters: AttendanceNonPaginationFilters = {
      timePreset: nextFilters.timePreset,
      dateFrom: nextFilters.dateFrom,
      dateTo: nextFilters.dateTo,
      status: nextFilters.status,
      targetMemberId: nextFilters.targetMemberId,
      employeeNameSearch: nextFilters.employeeNameSearch,
    };
    setFilters(nextNonPaginationFilters);
    if (!sameNonPaginationFilters(filters, nextNonPaginationFilters) && pageIndex !== 0) {
      replacePagination(0);
    }
  }

  const effectiveFilters = useMemo<AttendanceFiltersState>(() => {
    const pagination = { page: queryPage, pageSize };
    if (!isOperative) return { ...filters, ...pagination };
    if (filters.timePreset !== 'all_time' || filters.dateFrom != null || filters.dateTo != null) {
      return { ...filters, ...pagination };
    }
    return {
      ...buildDefaultFilters(true),
      status: filters.status,
      employeeNameSearch: filters.employeeNameSearch,
      ...pagination,
    };
  }, [filters, isOperative, pageSize, queryPage]);

  const orgQuery = useAttendanceQuery(orgSlug, memberId, effectiveFilters, {
    enabled: isOrgScope,
    mode,
    pageIndex,
    keepPreviousData: true,
  });
  const myQuery = useMyAttendanceQuery(orgSlug, memberId, effectiveFilters, {
    enabled: isOperativeScope(permissions.view) && !isOrgScope,
    mode,
    pageIndex,
    keepPreviousData: true,
  });
  const activeQuery = isOrgScope ? orgQuery : myQuery;
  const deleteMutation = useDeleteAttendanceMutation(orgSlug);

  useEffect(() => {
    console.info('[attendance-pagination] url-to-query', {
      currentRouteMode: mode,
      currentUrlPage: pageIndex,
      currentUrlPageSize: pageSize,
      queryPage: effectiveFilters.page,
      queryPageSize: effectiveFilters.pageSize,
    });
  }, [effectiveFilters.page, effectiveFilters.pageSize, mode, pageIndex, pageSize]);

  if (!isOperativeScope(permissions.view)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-neutral-500">
          You don&apos;t have permission to use this page.
        </p>
      </div>
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({
        orgSlug,
        memberId,
        targetMemberId: deleteTarget.employeeId,
        date: deleteTarget.date,
      });
      setDeleteTarget(null);
    } catch (err: unknown) {
      let status = 0;
      let message = '';
      if (err instanceof Error) {
        try {
          ({ status, message } = JSON.parse(err.message) as ApiError);
        } catch {
          message = err.message;
        }
      }
      if (status === 404) {
        toast.error('Record not found');
        setDeleteTarget(null);
      } else if (message) {
        toast.error(message);
      }
    }
  }

  return (
    <>
      <AttendancePermissionGate scope={permissions.edit}>
        <ManualAttendanceForm
          orgSlug={orgSlug}
          memberId={memberId}
          open={manualFormOpen}
          onOpenChange={setManualFormOpen}
        />
      </AttendancePermissionGate>

      <div>
        <AttendanceTable
          orgSlug={orgSlug}
          memberId={memberId}
          mode={mode}
          data={activeQuery.data}
          isLoading={activeQuery.isLoading}
          isError={activeQuery.isError}
          onRetry={activeQuery.refetch}
          filters={effectiveFilters}
          onFiltersChange={handleFiltersChange}
          onPageChange={(nextPage) => replacePagination(nextPage - 1)}
          onPageSizeChange={(nextPageSize) => replacePagination(0, nextPageSize)}
          onPageOutOfRange={(totalPages) => replacePagination(Math.max(0, totalPages - 1))}
          canEdit={isOperativeScope(permissions.edit)}
          canDelete={isOperativeScope(permissions.delete)}
          showEmployeeColumn={isOrgScope}
          onEdit={() => setManualFormOpen(true)}
          onDelete={(record) => setDeleteTarget(record)}
        />
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the record for {deleteTarget?.date ?? ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
