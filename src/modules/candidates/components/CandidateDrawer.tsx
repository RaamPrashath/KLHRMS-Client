'use client';

import { CalendarDays, ExternalLink, FileText, Mail, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCandidateApplicationDetail } from '@/modules/candidates/hooks/useAtsPipeline';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CandidateDrawer({
  orgSlug,
  memberId,
  applicationId,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  memberId: string;
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useCandidateApplicationDetail(orgSlug, memberId, applicationId);
  const detail = detailQuery.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-neutral-100 p-6">
          <SheetTitle className="text-xl font-semibold text-neutral-900">
            {detail ? `${detail.candidate.firstName} ${detail.candidate.lastName}` : 'Candidate'}
          </SheetTitle>
          <SheetDescription>
            {detail ? `${detail.jobPostingTitle} · ${detail.currentStage}` : 'Loading candidate profile'}
          </SheetDescription>
        </SheetHeader>

        {detailQuery.isLoading && (
          <div className="grid gap-4 p-6">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        )}

        {detail && (
          <div className="grid gap-5 p-6">
            <section className="rounded-xl border border-neutral-100 bg-surface p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Profile</h3>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-2">
                  <Mail className="size-4 text-neutral-400" />
                  {detail.candidate.email}
                </span>
                {detail.candidate.phone && (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="size-4 text-neutral-400" />
                    {detail.candidate.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-neutral-400" />
                  Applied {formatDate(detail.appliedAt)}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-100 bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Resume</h3>
                  <p className="text-xs text-neutral-500">Stored resume link for this application.</p>
                </div>
                {detail.resumeUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-neutral-500">No resume</span>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-neutral-100 bg-surface p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
                {detail.notes || 'No notes added yet.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                <span className="rounded-full bg-neutral-50 px-2 py-0.5">Source: {detail.source}</span>
                {detail.score !== null && (
                  <span className="rounded-full bg-neutral-50 px-2 py-0.5">Score: {detail.score}</span>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-neutral-100 bg-surface p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Stage history</h3>
              <div className="mt-4 grid gap-4">
                {detail.stageHistory.length === 0 && (
                  <p className="text-sm text-neutral-500">No movement history yet.</p>
                )}
                {detail.stageHistory.map((item) => (
                  <div key={item.id} className="grid grid-cols-[20px_1fr] gap-3">
                    <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-primary-ghost text-primary">
                      <FileText className="size-3" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {item.fromStageName ?? 'New'} to {item.toStageName ?? 'Stage'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(item.createdAt)}
                        {item.movedByName ? ` · ${item.movedByName}` : ''}
                      </p>
                      {item.note && <p className="mt-1 text-xs text-neutral-700">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
