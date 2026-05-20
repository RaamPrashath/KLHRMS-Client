'use client';

import { ChevronRight, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PipelineJobPosting } from '@/modules/candidates/types/atsTypes';

function formatPriority(value: string | null) {
  if (!value) return 'Unspecified';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPriorityClasses(priority: string | null) {
  if (priority === 'LOW') return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  if (priority === 'HIGH') return 'border-warning-border bg-warning-bg text-warning-text';
  if (priority === 'CRITICAL') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  if (priority === 'MEDIUM') return 'border-info-border bg-info-bg text-info-text';
  return 'border-neutral-200 bg-neutral-50 text-neutral-500';
}

export function CandidatesLandingTable({
  orgSlug,
  postings,
}: Readonly<{
  orgSlug: string;
  postings: PipelineJobPosting[];
}>) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');

  const filteredData = useMemo(() => {
    const value = globalFilter.trim().toLowerCase();
    if (!value) return postings;
    return postings.filter((posting) =>
      [
        posting.title,
        posting.priority ?? '',
        posting.openings?.toString() ?? '',
        posting.stageCount.toString(),
        posting.candidateCount.toString(),
      ]
        .join(' ')
        .toLowerCase()
        .includes(value),
    );
  }, [globalFilter, postings]);

  return (
    <div className="mx-4 mb-7 flex flex-1 flex-col sm:mx-6 lg:mx-7">
      <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search roles..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="border-0 bg-canvas pl-9 text-sm focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
            />
            {globalFilter ? (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-700"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[920px] grid-cols-[repeat(5,minmax(0,1fr))_52px] items-center border-b border-neutral-100 bg-canvas/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <div className="text-left">Role Name</div>
            <div className="text-center">Total Candidates</div>
            <div className="text-center">Total Stages</div>
            <div className="text-center">Priority</div>
            <div className="text-center">Openings</div>
            <div />
          </div>

          {filteredData.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-500">
              {globalFilter ? 'No roles match your search.' : 'No job openings are available yet.'}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredData.map((posting) => (
                <div
                  key={posting.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/${orgSlug}/candidates/${posting.slug}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      router.push(`/${orgSlug}/candidates/${posting.slug}`);
                    }
                  }}
                  className="grid cursor-pointer grid-cols-[repeat(5,minmax(0,1fr))_52px] items-center px-4 py-3 transition-colors hover:bg-canvas"
                >
                  <div className="truncate text-left text-sm font-medium text-neutral-900">{posting.title}</div>
                  <div className="text-center font-mono text-sm text-neutral-700">{posting.candidateCount}</div>
                  <div className="text-center font-mono text-sm text-neutral-700">{posting.stageCount}</div>
                  <div className="flex justify-center">
                    <Badge className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', getPriorityClasses(posting.priority))}>
                      {formatPriority(posting.priority)}
                    </Badge>
                  </div>
                  <div className="text-center font-mono text-sm text-neutral-700">{posting.openings ?? '—'}</div>
                  <div className="flex justify-center text-neutral-400">
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
