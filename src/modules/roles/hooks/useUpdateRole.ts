'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateRoleAction } from '@/modules/roles/api/roleServerActions';
import { type RoleUpdateInput } from '@/modules/roles/schema/roleSchemas';
import { type RoleResponse } from '@/modules/roles/types/role';

interface UpdateRoleParams {
  roleId: string;
  data: RoleUpdateInput;
}

export function useUpdateRole(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<RoleResponse, Error, UpdateRoleParams>({
    mutationFn: ({ roleId, data }) =>
      updateRoleAction({ orgSlug, memberId, roleId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', orgSlug] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
  };
}
