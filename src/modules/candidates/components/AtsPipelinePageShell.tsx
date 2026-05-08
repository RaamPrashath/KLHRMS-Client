'use client';

import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  orgSlug: string;
  memberId: string;
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
    <div className="min-h-full bg-canvas p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">ATS Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage candidate applications by job posting.</p>
        </div>
        <Select
          value={selectedPostingId ?? undefined}
          onValueChange={setSelectedPostingId}
          disabled={postingsQuery.isLoading || !postingsQuery.data?.length}
        >
          <SelectTrigger className="w-full bg-surface lg:w-[320px]">
            <SelectValue placeholder={postingsQuery.isLoading ? 'Loading jobs' : 'Select job posting'} />
          </SelectTrigger>
          <SelectContent>
            {(postingsQuery.data ?? []).map((posting) => (
              <SelectItem key={posting.id} value={posting.id}>
                {posting.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {postingsQuery.data?.length === 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-center text-sm text-neutral-500">
          No job postings are available yet.
        </div>
      ) : (
        <AtsKanbanBoard
          orgSlug={orgSlug}
          memberId={memberId}
          jobPostingId={selectedPostingId}
        />
      )}
    </div>
  );
}
