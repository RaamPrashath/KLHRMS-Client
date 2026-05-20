'use client';

import { useRouter } from 'next/navigation';

import { AtsKanbanBoard } from '@/modules/candidates/components/AtsKanbanBoard';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';

export function AtsJobPipelinePageShell({
  orgSlug,
  memberId,
  jobSlug,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
}) {
  const router = useRouter();
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const postings = postingsQuery.data ?? [];
  const currentPosting = postings.find((posting) => posting.slug === jobSlug) ?? null;

  if (postingsQuery.isLoading) {
    return <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">Loading pipeline…</div>;
  }

  if (!currentPosting) {
    return <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">This job posting was not found.</div>;
  }

  return (
    <AtsKanbanBoard
      orgSlug={orgSlug}
      memberId={memberId}
      jobPostingId={currentPosting.id}
      jobPostings={postings}
      onJobPostingChange={(postingId) => {
        const posting = postings.find((item) => item.id === postingId);
        if (posting) {
          router.push(`/${orgSlug}/candidates/${posting.slug}`);
        }
      }}
      isLoadingPostings={postingsQuery.isLoading}
      showJobSelector={true}
      pipelineBasePath={`/${orgSlug}/candidates/${jobSlug}`}
    />
  );
}
