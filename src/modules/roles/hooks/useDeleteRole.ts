'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteRoleAction } from '@/modules/roles/api/roleServerActions';

export function useDeleteRole(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, string>({
    mutationFn: (roleId) => deleteRoleAction({ orgSlug, memberId, roleId }),
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
