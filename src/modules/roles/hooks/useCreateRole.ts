'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRoleAction } from '@/modules/roles/api/roleServerActions';
import { type RoleCreateInput } from '@/modules/roles/schema/roleSchemas';
import { type RoleResponse } from '@/modules/roles/types/role';

export function useCreateRole(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<RoleResponse, Error, RoleCreateInput>({
    mutationFn: (data) => createRoleAction({ orgSlug, memberId, data }),
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
