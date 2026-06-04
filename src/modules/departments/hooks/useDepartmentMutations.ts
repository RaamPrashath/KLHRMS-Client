'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from '@/modules/departments/api/departmentServerActions';

export function useDepartmentMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['departments', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['departments-meta', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['projects-meta', orgSlug] });
  };

  return {
    createDepartment: useMutation({
      mutationFn: (data: Parameters<typeof createDepartmentAction>[0]['data']) =>
        createDepartmentAction({ orgSlug, memberId, data }),
      onSuccess: invalidateAll,
    }),
    updateDepartment: useMutation({
      mutationFn: ({ departmentId, data }: { departmentId: string; data: Parameters<typeof updateDepartmentAction>[0]['data'] }) =>
        updateDepartmentAction({ orgSlug, memberId, departmentId, data }),
      onSuccess: invalidateAll,
    }),
    deleteDepartment: useMutation({
      mutationFn: (departmentId: string) => deleteDepartmentAction({ orgSlug, memberId, departmentId }),
      onSuccess: invalidateAll,
    }),
  };
}
