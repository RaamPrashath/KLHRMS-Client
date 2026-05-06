'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchEmployeesAction,
  fetchEmployeeDepartmentsAction,
  fetchEmployeeRolesAction,
} from '@/modules/employees/api/employeeServerActions';
import type {
  EmployeeListResponse,
  EmployeeFilterOption,
} from '@/modules/employees/types/employeeTypes';
import type { EmployeeFiltersInput } from '@/modules/employees/schema/employeeSchemas';

export function useEmployeesQuery(
  orgSlug: string,
  memberId: string,
  filters: Partial<EmployeeFiltersInput>,
) {
  return useQuery<EmployeeListResponse, Error>({
    queryKey: ['employees', orgSlug, filters],
    queryFn: () => fetchEmployeesAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
  });
}

export function useEmployeeDepartmentsQuery(orgSlug: string, memberId: string) {
  return useQuery<EmployeeFilterOption[], Error>({
    queryKey: ['employee-departments', orgSlug],
    queryFn: () => fetchEmployeeDepartmentsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 60_000,
  });
}

export function useEmployeeRolesQuery(orgSlug: string, memberId: string) {
  return useQuery<EmployeeFilterOption[], Error>({
    queryKey: ['employee-roles', orgSlug],
    queryFn: () => fetchEmployeeRolesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 60_000,
  });
}
