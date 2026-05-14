'use client';

import { useRouter } from 'next/navigation';

import { AtsKanbanBoard } from '@/modules/candidates/components/AtsKanbanBoard';

interface CandidatesJobPageClientProps {
  orgSlug: string;
  memberId: string;
  jobPostingId: string;
  jobPostings: Array<{ id: string; slug?: string; title: string; status?: string }>;
}

export function CandidatesJobPageClient({
  orgSlug,
  memberId,
  jobPostingId,
  jobPostings,
}: Readonly<CandidatesJobPageClientProps>) {
  const router = useRouter();

  return (
    <AtsKanbanBoard
      orgSlug={orgSlug}
      memberId={memberId}
      jobPostingId={jobPostingId}
      jobPostings={jobPostings}
      onJobPostingChange={(postingId) => {
        const posting = jobPostings.find((item) => item.id === postingId);
        if (posting?.slug) {
          router.push(`/${orgSlug}/candidates/${posting.slug}`);
        }
      }}
      isLoadingPostings={false}
      showJobSelector={false}
      pipelineBasePath={`/${orgSlug}/candidates/stage`}
    />
  );
}
