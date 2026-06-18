'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deactivateEmployeeAction,
  fetchDeactivatedEmployeesAction,
  fetchDeactivationImpactAction,
  fetchEmployeesAction,
  fetchEmployeeRolesAction,
  reactivateEmployeeAction,
} from '@/modules/employees/api/employeeServerActions';
import type {
  EmployeeListResponse,
  EmployeeFilterOption,
} from '@/modules/employees/types/employeeTypes';
import type { EmployeeFiltersInput } from '@/modules/employees/schema/employeeSchemas';

export function useEmployeesQuery(
  orgSlug: string,
  memberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeListResponse, Error>({
    queryKey: ['employees', orgSlug],
    queryFn: () => fetchEmployeesAction({ orgSlug, memberId }),
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

export function useDeactivatedEmployeesQuery(orgSlug: string, memberId: string) {
  return useQuery<EmployeeListResponse, Error>({
    queryKey: ['deactivated-employees', orgSlug],
    queryFn: () => fetchDeactivatedEmployeesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
  });
}

export function useReactivateEmployeeMutation(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetMemberId: string) =>
      reactivateEmployeeAction({ orgSlug, memberId, targetMemberId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['deactivated-employees', orgSlug] });
      await queryClient.invalidateQueries({ queryKey: ['employees', orgSlug] });
    },
  });
}

export function useDeactivationImpactQuery(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
) {
  return useQuery({
    queryKey: ['deactivation-impact', orgSlug, targetMemberId],
    queryFn: () =>
      fetchDeactivationImpactAction({ orgSlug, memberId, targetMemberId }),
    enabled: !!orgSlug && !!memberId && !!targetMemberId,
    staleTime: 0,
  });
}
