'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchProjectDetailAction,
  fetchProjectMetaAction,
  fetchProjectsAction,
} from '@/modules/projects/api/projectServerActions';
import type {
  ProjectDetail,
  ProjectFiltersState,
  ProjectListResponse,
  ProjectMetaResponse,
} from '@/modules/projects/types/projectTypes';

export function useProjectsQuery(orgSlug: string, memberId: string, filters: ProjectFiltersState) {
  return useQuery<ProjectListResponse, Error>({
    queryKey: ['projects', orgSlug, filters],
    queryFn: () => fetchProjectsAction({ orgSlug, memberId, filters }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useProjectMetaQuery(orgSlug: string, memberId: string) {
  return useQuery<ProjectMetaResponse, Error>({
    queryKey: ['projects-meta', orgSlug],
    queryFn: () => fetchProjectMetaAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useProjectDetailQuery(orgSlug: string, memberId: string, projectId: string | null) {
  return useQuery<ProjectDetail, Error>({
    queryKey: ['project', orgSlug, projectId],
    queryFn: () => fetchProjectDetailAction({ orgSlug, memberId, projectId: projectId! }),
    enabled: !!orgSlug && !!memberId && !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
