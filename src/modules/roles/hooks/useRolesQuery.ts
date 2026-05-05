'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRolesAction } from '@/modules/roles/api/roleServerActions';
import { type RoleResponse } from '@/modules/roles/types/role';

export function useRolesQuery(
  orgSlug: string,
  memberId: string,
  search?: string,
): {
  data: RoleResponse[] | undefined;
  filteredRoles: RoleResponse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<RoleResponse[], Error>({
    queryKey: ['roles', orgSlug],
    queryFn: () => fetchRolesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });

  const filteredRoles = useMemo(() => {
    const roles = query.data ?? [];
    if (!search?.trim()) return roles;
    const term = search.toLowerCase().trim();
    return roles.filter((role) => role.name.toLowerCase().includes(term));
  }, [query.data, search]);

  return {
    data: query.data,
    filteredRoles,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
