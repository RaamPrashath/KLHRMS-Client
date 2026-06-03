'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deactivateEmployeeAction,
  fetchEmployeesAction,
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
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeListResponse, Error>({
    queryKey: ['employees', orgSlug, filters],
    queryFn: () => fetchEmployeesAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId && (options?.enabled ?? true),
    staleTime: 30_000,
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

export function useDeactivateEmployeeMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetMemberId: string) =>
      deactivateEmployeeAction({ orgSlug, memberId, targetMemberId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees', orgSlug] });
    },
  });
}
