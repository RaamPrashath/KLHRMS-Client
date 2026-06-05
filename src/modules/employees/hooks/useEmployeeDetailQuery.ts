'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchEmployeeDetailAction,
  fetchEmployeeDirectReportsAction,
  fetchEmployeeGroupsAction,
  fetchEmployeeManagerChainAction,
  fetchMyEmployeeProfileAction,
  refreshEmployeeFromGraphAction,
  updateEmployeeDetailsAction,
} from '@/modules/employees/api/employeeDetailServerActions';
import type {
  EmployeeDetail,
  EmployeeDirectReportsResponse,
  EmployeeGroupListResponse,
  EmployeeManagerChainResponse,
  EmployeeRefreshResult,
  UpdateEmployeeDetailsInput,
  UpdateEmployeeDetailsResponse,
} from '@/modules/employees/types/employeeDetailTypes';

export const employeeDetailQueryKey = (
  orgSlug: string,
  targetMemberId: string,
) => ['employee-detail', orgSlug, targetMemberId] as const;

export const myEmployeeProfileQueryKey = (orgSlug: string) =>
  ['employee-detail-me', orgSlug] as const;

export function useEmployeeDetailQuery(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeDetail, Error>({
    queryKey: employeeDetailQueryKey(orgSlug, targetMemberId),
    queryFn: () =>
      fetchEmployeeDetailAction({ orgSlug, memberId, targetMemberId }),
    enabled:
      !!orgSlug && !!memberId && !!targetMemberId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useMyEmployeeProfileQuery(
  orgSlug: string,
  memberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeDetail, Error>({
    queryKey: myEmployeeProfileQueryKey(orgSlug),
    queryFn: () => fetchMyEmployeeProfileAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useEmployeeDirectReportsQuery(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeDirectReportsResponse, Error>({
    queryKey: ['employee-direct-reports', orgSlug, targetMemberId],
    queryFn: () =>
      fetchEmployeeDirectReportsAction({ orgSlug, memberId, targetMemberId }),
    enabled:
      !!orgSlug && !!memberId && !!targetMemberId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useEmployeeGroupsQuery(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeGroupListResponse, Error>({
    queryKey: ['employee-groups', orgSlug, targetMemberId],
    queryFn: () =>
      fetchEmployeeGroupsAction({ orgSlug, memberId, targetMemberId }),
    enabled:
      !!orgSlug && !!memberId && !!targetMemberId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useEmployeeManagerChainQuery(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<EmployeeManagerChainResponse, Error>({
    queryKey: ['employee-manager-chain', orgSlug, targetMemberId],
    queryFn: () =>
      fetchEmployeeManagerChainAction({ orgSlug, memberId, targetMemberId }),
    enabled:
      !!orgSlug && !!memberId && !!targetMemberId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useRefreshEmployeeFromGraphMutation(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
) {
  const queryClient = useQueryClient();

  return useMutation<EmployeeRefreshResult, Error, void>({
    mutationFn: () =>
      refreshEmployeeFromGraphAction({ orgSlug, memberId, targetMemberId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: employeeDetailQueryKey(orgSlug, targetMemberId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['employee-direct-reports', orgSlug, targetMemberId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['employee-manager-chain', orgSlug, targetMemberId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['employees', orgSlug],
        }),
      ]);
    },
  });
}

export function useUpdateEmployeeDetailsMutation(
  orgSlug: string,
  memberId: string,
  targetMemberId: string,
) {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateEmployeeDetailsResponse,
    Error,
    UpdateEmployeeDetailsInput
  >({
    mutationFn: (payload) =>
      updateEmployeeDetailsAction({
        orgSlug,
        memberId,
        targetMemberId,
        payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: employeeDetailQueryKey(orgSlug, targetMemberId),
        }),
        queryClient.invalidateQueries({
          queryKey: myEmployeeProfileQueryKey(orgSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: ['employees', orgSlug],
        }),
      ]);
    },
  });
}
