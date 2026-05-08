'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addProjectMemberAction,
  createProjectAction,
  deleteProjectAction,
  removeProjectMemberAction,
  updateProjectAction,
} from '@/modules/projects/api/projectServerActions';

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
    removeMember: useMutation({
      mutationFn: ({ projectId, targetMemberId }: { projectId: string; targetMemberId: string }) =>
        removeProjectMemberAction({ orgSlug, memberId, projectId, targetMemberId }),
      onSuccess: async (project) => invalidateAll(project.id),
    }),
  };
}
