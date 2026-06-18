'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { useEmployeesQuery, useEmployeeRolesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { EmployeeTable } from './EmployeeTable';
import { updateEmployeeRoleAction } from '@/app/actions/organizationActions';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

interface EmployeePageShellProps {
  orgSlug: string;
  memberId: string;
  permissions: RolePermissions | null;
}

const SEARCH_DEBOUNCE_MS = 300;

export function EmployeePageShell({ orgSlug, memberId, permissions }: Readonly<EmployeePageShellProps>) {
  const router = useRouter();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input → applied search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ── Role editing ───────────────────────────────────────────────────────────
  const queryClient = useQueryClient();

  const canEditRole = permissions
    ? getScope(permissions, 'employees', 'edit') !== 'none' && getScope(permissions, 'permission', 'edit') !== 'none'
    : false;

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

  // ── Data query: fetch all employees once ────────────────────────────────────
  const { data, isLoading, isError, error } = useEmployeesQuery(orgSlug, memberId);
  const { data: roles = [] } = useEmployeeRolesQuery(orgSlug, memberId);

  const allItems: EmployeeListItem[] = useMemo(() => data?.items ?? [], [data?.items]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (roleId && item.role?.id !== roleId) return false;
      if (source === 'microsoft' && !item.microsoft_synced) return false;
      if (source === 'credentials' && item.microsoft_synced) return false;
      if (term) {
        const haystack = [
          item.name,
          item.email,
          item.user_principal_name ?? '',
          item.role?.name ?? '',
          item.employee_id ?? '',
          item.department ?? '',
          item.job_title ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [allItems, search, roleId, source]);

  // ── Client-side pagination ─────────────────────────────────────────────────
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(pageStart, pageStart + pageSize);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleRoleChange = useCallback((value: string | undefined) => {
    setRoleId(value);
    setPage(1);
  }, []);

  const handleSourceChange = useCallback((value: string | undefined) => {
    setSource(value);
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setRoleId(undefined);
    setSource(undefined);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
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

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Employees</h1>
        {canEditRole && orgSlug && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/employees/deactivated`)}
            className="shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"
          >
            <UserX className="size-4 mr-1.5" /> View Deactivated
          </Button>
        )}
      </div>
      <EmployeeTable
        data={paginatedItems}
        isLoading={isLoading}
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        search={searchInput}
        roleId={roleId}
        source={source}
        roles={roles}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onRoleChange={handleRoleChange}
        onSourceChange={handleSourceChange}
        onClearAll={handleClearAll}
        canEditRole={canEditRole}
        onUpdateRole={handleUpdateRole}
        orgSlug={orgSlug}
      />
    </div>
  );
}
