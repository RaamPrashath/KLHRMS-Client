'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AtsKanbanBoard } from '@/modules/candidates/components/AtsKanbanBoard';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';

function PipelinePageSkeleton() {
  return (
    <div className="min-h-full bg-canvas p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-full rounded-md lg:w-[320px]" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((column) => (
          <Skeleton key={column} className="h-[520px] w-[300px] shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AtsPipelinePageShell({
  orgSlug,
  memberId,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
}) {
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPostingId && postingsQuery.data?.[0]) {
      setSelectedPostingId(postingsQuery.data[0].id);
    }
  }, [postingsQuery.data, selectedPostingId]);

  if (postingsQuery.isLoading) {
    return <PipelinePageSkeleton />;
  }

  return (
    <div className="min-h-full bg-canvas px-6 mt-6">
      <div className="mb-6 flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">ATS Pipeline</h1>
      </div>

      {postingsQuery.data?.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
          No job postings are available yet.
        </div>
      ) : (
        <AtsKanbanBoard
          orgSlug={orgSlug}
          memberId={memberId}
          jobPostingId={selectedPostingId}
          jobPostings={postingsQuery.data ?? []}
          onJobPostingChange={setSelectedPostingId}
          isLoadingPostings={postingsQuery.isLoading}
        />
      )}
    </div>
  );
}
