'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDepartmentMemberAction,
  assignDepartmentHeadAction,
  bulkAssignDepartmentMembersAction,
  createDepartmentAction,
  deleteDepartmentAction,
  removeDepartmentHeadAction,
  removeDepartmentMemberAction,
  updateDepartmentAction,
} from '@/modules/departments/api/departmentServerActions';
import type { DepartmentSummary } from '@/modules/departments/types/departmentTypes';

interface MutationContext {
  previous?: DepartmentSummary;
}

function getDepartmentQueryKey(orgSlug: string, departmentId: string) {
  return ['department', orgSlug, departmentId] as const;
}

export function useDepartmentMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  const invalidateAll = async (departmentId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['departments', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['departments-meta', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['projects-meta', orgSlug] });
    if (departmentId) await queryClient.invalidateQueries({ queryKey: ['department', orgSlug, departmentId] });
  };

  return {
    createDepartment: useMutation({
      mutationFn: (data: Parameters<typeof createDepartmentAction>[0]['data']) =>
        createDepartmentAction({ orgSlug, memberId, data }),
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    updateDepartment: useMutation({
      mutationFn: ({ departmentId, data }: { departmentId: string; data: Parameters<typeof updateDepartmentAction>[0]['data'] }) =>
        updateDepartmentAction({ orgSlug, memberId, departmentId, data }),
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    deleteDepartment: useMutation({
      mutationFn: (departmentId: string) => deleteDepartmentAction({ orgSlug, memberId, departmentId }),
      onSuccess: async () => invalidateAll(),
    }),
    addMember: useMutation({
      mutationFn: ({ departmentId, targetMemberId }: { departmentId: string; targetMemberId: string }) =>
        addDepartmentMemberAction({ orgSlug, memberId, departmentId, targetMemberId }),
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    bulkAssignMembers: useMutation({
      mutationFn: ({ departmentId, memberIds }: { departmentId: string; memberIds: string[] }) =>
        bulkAssignDepartmentMembersAction({ orgSlug, memberId, departmentId, memberIds }),
      onMutate: async ({ departmentId, memberIds }): Promise<MutationContext> => {
        const queryKey = getDepartmentQueryKey(orgSlug, departmentId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<DepartmentSummary>(queryKey);

        queryClient.setQueryData<DepartmentSummary>(queryKey, (old) => {
          if (!old) return old;
          const existingIds = new Set(old.members.map((m) => m.memberId));
          const newMembers = memberIds
            .filter((id) => !existingIds.has(id))
            .map((id) => ({
              id: `temp-${id}`,
              memberId: id,
              name: null,
              email: null,
              image: null,
            }));
          return {
            ...old,
            memberCount: old.memberCount + newMembers.length,
            members: [...old.members, ...newMembers],
          };
        });

        return { previous };
      },
      onError: (_err, vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getDepartmentQueryKey(orgSlug, vars.departmentId), context.previous);
        }
      },
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    removeMember: useMutation({
      mutationFn: ({ departmentId, targetMemberId }: { departmentId: string; targetMemberId: string }) =>
        removeDepartmentMemberAction({ orgSlug, memberId, departmentId, targetMemberId }),
      onMutate: async ({ departmentId, targetMemberId }): Promise<MutationContext> => {
        const queryKey = getDepartmentQueryKey(orgSlug, departmentId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<DepartmentSummary>(queryKey);

        queryClient.setQueryData<DepartmentSummary>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            memberCount: Math.max(0, old.memberCount - 1),
            members: old.members.filter((m) => m.memberId !== targetMemberId),
          };
        });

        return { previous };
      },
      onError: (_err, vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getDepartmentQueryKey(orgSlug, vars.departmentId), context.previous);
        }
      },
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    assignHead: useMutation({
      mutationFn: ({ departmentId, headMemberId }: { departmentId: string; headMemberId: string }) =>
        assignDepartmentHeadAction({ orgSlug, memberId, departmentId, headMemberId }),
      onSuccess: async (department) => invalidateAll(department.id),
    }),
    removeHead: useMutation({
      mutationFn: ({ departmentId, headMemberId }: { departmentId: string; headMemberId: string }) =>
        removeDepartmentHeadAction({ orgSlug, memberId, departmentId, headMemberId }),
      onSuccess: async (department) => invalidateAll(department.id),
    }),
  };
}
