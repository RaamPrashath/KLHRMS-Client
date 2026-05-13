'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProjectsForAttendanceAction } from '@/modules/projects/api/projectServerActions';
import type { ProjectForAttendance } from '@/modules/projects/types/projectTypes';

export function useProjectsForAttendance(orgSlug: string, memberId: string) {
  return useQuery<ProjectForAttendance[], Error>({
    queryKey: ['projects-for-attendance', orgSlug],
    queryFn: () => fetchProjectsForAttendanceAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
