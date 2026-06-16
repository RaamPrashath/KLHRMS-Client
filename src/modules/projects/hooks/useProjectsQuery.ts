'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchProjectByIdAction,
  fetchProjectMetaAction,
  fetchProjectsAction,
} from '@/modules/projects/api/projectServerActions';
import type {
  ProjectDetail,
  ProjectFiltersState,
  ProjectListResponse,
  ProjectMetaResponse,
  ProjectSummary,
} from '@/modules/projects/types/projectTypes';

async function fetchAllProjects(orgSlug: string, memberId: string): Promise<ProjectSummary[]> {
  const PAGE_SIZE = 100;
  let page = 1;
  let allItems: ProjectSummary[] = [];
  let totalPages = 1;

  do {
    const result = await fetchProjectsAction({ orgSlug, memberId, page, pageSize: PAGE_SIZE });
    allItems = allItems.concat(result.items);
    totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    page++;
  } while (page <= totalPages);

  return allItems;
}

export function useProjectsAllQuery(orgSlug: string, memberId: string) {
  return useQuery<{ items: ProjectSummary[]; total: number }, Error>({
    queryKey: ['projects-all', orgSlug],
    queryFn: async () => {
      const items = await fetchAllProjects(orgSlug, memberId);
      return { items, total: items.length };
    },
    enabled: !!orgSlug && !!memberId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useProjectsQuery(orgSlug: string, memberId: string, filters: ProjectFiltersState) {
  return useQuery<ProjectListResponse, Error>({
    queryKey: ['projects', orgSlug, filters],
    queryFn: () => fetchProjectsAction({ 
      orgSlug, 
      memberId, 
      search: filters.search,
      status: filters.status,
      billable: filters.billable,
      page: filters.page,
      pageSize: filters.pageSize,
    }),
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
    queryFn: () => fetchProjectByIdAction({ orgSlug, memberId, projectId: projectId! }),
    enabled: !!orgSlug && !!memberId && !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
