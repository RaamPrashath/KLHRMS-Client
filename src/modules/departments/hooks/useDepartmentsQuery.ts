'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentMetaAction, fetchDepartmentsAction } from '@/modules/departments/api/departmentServerActions';
import type { DepartmentListResponse, DepartmentMetaResponse } from '@/modules/departments/types/departmentTypes';

export interface DepartmentFiltersInput {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useDepartmentsQuery(orgSlug: string, memberId: string, filters: Partial<DepartmentFiltersInput> = {}) {
  const { search, page, pageSize } = filters;
  return useQuery<DepartmentListResponse, Error>({
    queryKey: ['departments', orgSlug, search ?? '', page ?? 1, pageSize ?? 25],
    queryFn: () => fetchDepartmentsAction({ orgSlug, memberId, search: search || undefined, page, pageSize }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useDepartmentMetaQuery(orgSlug: string, memberId: string, enabled: boolean) {
  return useQuery<DepartmentMetaResponse, Error>({
    queryKey: ['departments-meta', orgSlug],
    queryFn: () => fetchDepartmentMetaAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
