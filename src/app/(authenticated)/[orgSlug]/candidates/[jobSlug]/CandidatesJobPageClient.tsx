'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { AtsKanbanBoard } from '@/modules/candidates/components/AtsKanbanBoard';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';
import type { RolePermissions } from '@/modules/roles/types/role';

interface CandidatesJobPageClientProps {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  defaultView?: 'kanban' | 'table';
  permissions?: RolePermissions | null;
}

export function CandidatesJobPageClient({
  orgSlug,
  memberId,
  jobSlug,
  defaultView,
  permissions,
}: Readonly<CandidatesJobPageClientProps>) {
  const router = useRouter();
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const postings = useMemo(() => postingsQuery.data ?? [], [postingsQuery.data]);

  const currentPosting = useMemo(
    () => postings.find((p) => p.slug === jobSlug) ?? null,
    [jobSlug, postings],
  );

  return (
    <AtsKanbanBoard
      orgSlug={orgSlug}
      memberId={memberId}
      jobPostingId={currentPosting?.id ?? null}
      jobPostings={postings}
      onJobPostingChange={(postingId) => {
        const posting = postings.find((item) => item.id === postingId);
        if (posting?.slug) {
          router.push(`/${orgSlug}/candidates/${posting.slug}/kanban`);
        }
      }}
      isLoadingPostings={postingsQuery.isLoading}
      showJobSelector={false}
      pipelineBasePath={`/${orgSlug}/candidates/${jobSlug}/stage`}
      defaultView={defaultView}
      permissions={permissions}
    />
  );
}
