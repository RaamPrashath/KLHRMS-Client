'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMemberAction,
  bulkAssignProjectMembersAction,
  createProjectAction,
  createProjectTaskAction,
  deleteProjectAction,
  removeProjectMemberAction,
  updateProjectAction,
} from '@/modules/projects/api/projectServerActions';
import type { ProjectTaskInput } from '@/modules/projects/schema/projectSchemas';
import type { ProjectDetail, ProjectMemberSummary, ProjectTaskSummary } from '@/modules/projects/types/projectTypes';

interface MutationContext {
  previous?: ProjectDetail;
}

function getProjectQueryKey(orgSlug: string, projectId: string) {
  return ['project', orgSlug, projectId] as const;
}

export function useProjectMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const invalidateAll = async (projectId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['projects', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['projects-meta', orgSlug] });
    if (projectId) await queryClient.invalidateQueries({ queryKey: ['project', orgSlug, projectId] });
  };

  return {
    createProject: useMutation({
      mutationFn: (data: Parameters<typeof createProjectAction>[0]['data']) =>
        createProjectAction({ orgSlug, memberId, data }),
      onSuccess: async (project) => invalidateAll(project.id),
    }),
    updateProject: useMutation({
      mutationFn: ({ projectId, data }: { projectId: string; data: Parameters<typeof updateProjectAction>[0]['data'] }) =>
        updateProjectAction({ orgSlug, memberId, projectId, data }),
      onSuccess: async (project) => invalidateAll(project.id),
    }),
    deleteProject: useMutation({
      mutationFn: (projectId: string) => deleteProjectAction({ orgSlug, memberId, projectId }),
      onSuccess: async () => invalidateAll(),
    }),
    addMember: useMutation({
      mutationFn: ({ projectId, data }: { projectId: string; data: Parameters<typeof addProjectMemberAction>[0]['data'] }) =>
        addProjectMemberAction({ orgSlug, memberId, projectId, data }),
      onSuccess: async (project) => invalidateAll(project.id),
    }),
    bulkAssignMembers: useMutation({
      mutationFn: ({ projectId, memberIds }: { projectId: string; memberIds: string[] }) =>
        bulkAssignProjectMembersAction({ orgSlug, memberId, projectId, memberIds }),
      onMutate: async ({ projectId, memberIds }): Promise<MutationContext> => {
        const queryKey = getProjectQueryKey(orgSlug, projectId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<ProjectDetail>(queryKey);

        queryClient.setQueryData<ProjectDetail>(queryKey, (old) => {
          if (!old) return old;
          const optimisticMembers: ProjectMemberSummary[] = memberIds.map((id: string) => ({
            id: `temp-${id}`,
            memberId: id,
            name: null,
            email: null,
            role: null,
            allocatedHours: null,
          }));
          return {
            ...old,
            memberCount: old.memberCount + memberIds.length,
            members: [...old.members, ...optimisticMembers],
          };
        });

        return { previous };
      },
      onError: (_err, vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getProjectQueryKey(orgSlug, vars.projectId), context.previous);
        }
      },
      onSuccess: async (project) => invalidateAll(project.id),
    }),
    removeMember: useMutation({
      mutationFn: ({ projectId, targetMemberId }: { projectId: string; targetMemberId: string }) =>
        removeProjectMemberAction({ orgSlug, memberId, projectId, targetMemberId }),
      onMutate: async ({ projectId, targetMemberId }): Promise<MutationContext> => {
        const queryKey = getProjectQueryKey(orgSlug, projectId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<ProjectDetail>(queryKey);

        queryClient.setQueryData<ProjectDetail>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            memberCount: Math.max(0, old.memberCount - 1),
            members: old.members.filter((member) => member.memberId !== targetMemberId),
          };
        });

        return { previous };
      },
      onError: (_err, vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getProjectQueryKey(orgSlug, vars.projectId), context.previous);
        }
      },
      onSuccess: async (project) => invalidateAll(project.id),
    }),
    createTask: useMutation({
      mutationFn: ({ projectId, data }: { projectId: string; data: ProjectTaskInput }) =>
        createProjectTaskAction({ orgSlug, memberId, projectId, data }),
      onMutate: async ({ projectId, data }): Promise<MutationContext> => {
        const queryKey = getProjectQueryKey(orgSlug, projectId);
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<ProjectDetail>(queryKey);

        const tempTask: ProjectTaskSummary = {
          id: `temp-${Date.now()}`,
          name: data.name,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<ProjectDetail>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            taskCount: old.taskCount + 1,
            tasks: [...old.tasks, tempTask],
          };
        });

        return { previous };
      },
      onError: (_err, vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getProjectQueryKey(orgSlug, vars.projectId), context.previous);
        }
      },
      onSuccess: async (_tasks, { projectId }) => invalidateAll(projectId),
    }),
  };
}
