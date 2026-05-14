'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';

export function AtsPipelineSectionLayout({
  orgSlug,
  memberId,
  jobSlug,
  children,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const postings = postingsQuery.data ?? [];
  const currentPosting = postings.find((posting) => posting.slug === jobSlug) ?? null;

  return (
    <div className="min-h-full bg-canvas">
      <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-4xl font-semibold tracking-tight text-neutral-900">ATS Pipeline</p>
          </div>
          <Select
            value={currentPosting?.slug}
            onValueChange={(value) => router.push(`/${orgSlug}/jobs/${value}/pipeline`)}
            disabled={postingsQuery.isLoading || postings.length === 0}
          >
            <SelectTrigger className="w-full bg-surface lg:w-[320px]">
              <SelectValue placeholder="Select job posting" />
            </SelectTrigger>
            <SelectContent>
              {postings.map((posting) => (
                <SelectItem key={posting.id} value={posting.slug}>
                  {posting.title}{posting.status !== 'PUBLISHED' ? ' [Closed]' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </div>
  );
}
