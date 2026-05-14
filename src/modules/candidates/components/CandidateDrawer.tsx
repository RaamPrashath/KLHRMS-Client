'use client';

import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, FileDown, FileText, Loader2, Mail, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useCandidateApplicationDetail,
  useUpdateCandidateApplicationDetail,
} from '@/modules/candidates/hooks/useAtsPipeline';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function relativeAppliedDate(value: string): string {
  const applied = new Date(value).getTime();
  const diffDays = Math.max(0, Math.round((Date.now() - applied) / 86_400_000));
  if (diffDays === 0) return 'Applied today';
  if (diffDays === 1) return 'Applied 1 day ago';
  return `Applied ${diffDays} days ago`;
}

function statusTone(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'REJECTED') return 'destructive';
  if (status === 'FINALIZED' || status === 'COMPLETED') return 'default';
  if (status === 'PENDING' || status === 'ONGOING') return 'secondary';
  return 'outline';
}

function CollapsibleCoverLetter({ text }: { readonly text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const long = (text?.length ?? 0) > 200;
  const display = text && !expanded && long ? `${text.slice(0, 200)}...` : text;
  return (
    <section className="rounded-xl border border-neutral-100 bg-surface p-4">
      <p className="text-sm font-semibold text-neutral-900">Cover Letter</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
        {display || 'No cover letter submitted.'}
      </p>
      {long ? (
        <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => setExpanded(!expanded)}>
          {expanded ? <>Show less <ChevronUp className="size-3.5" /></> : <>Show more <ChevronDown className="size-3.5" /></>}
        </button>
      ) : null}
    </section>
  );
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
  const updateDetail = useUpdateCandidateApplicationDetail(orgSlug, memberId);
  const detail = detailQuery.data;
  const [notesDraft, setNotesDraft] = useState('');
  const candidateName = useMemo(
    () => detail ? `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim() : 'Candidate',
    [detail],
  );

  async function saveNotes() {
    if (!detail) return;
    if ((detail.internalNotes ?? '') === notesDraft) return;
    await updateDetail.mutateAsync({
      applicationId: detail.id,
      data: { internalNotes: notesDraft },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(960px,95vw)] flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-surface p-0">
        <DialogHeader className="border-b border-neutral-100 px-6 py-5">
          <DialogTitle className="text-2xl font-semibold text-neutral-900">{candidateName}</DialogTitle>
          {detail ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <span>{detail.jobPostingTitle}</span>
              <span className="size-1 rounded-full bg-neutral-300" />
              <span>{relativeAppliedDate(detail.appliedAt)}</span>
              <Badge variant={statusTone(detail.status)}>{detail.currentStage}</Badge>
            </div>
          ) : null}
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="grid gap-4 p-6">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : null}

        {detail ? (
          <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-neutral-100 px-6 py-3">
              <TabsList className="grid w-full max-w-[240px] grid-cols-2 bg-neutral-50">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                <section className="grid gap-4 rounded-xl border border-neutral-100 bg-canvas p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Email</p>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-900"><Mail className="size-4 text-neutral-400" />{detail.candidate.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Phone</p>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-900"><Phone className="size-4 text-neutral-400" />{detail.candidate.phone ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">LinkedIn</p>
                    {detail.candidate.linkedinUrl ? (
                      <a href={detail.candidate.linkedinUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        Open profile <ExternalLink className="size-4" />
                      </a>
                    ) : <p className="mt-1 text-sm text-neutral-500">Not provided</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Portfolio</p>
                    {detail.candidate.portfolioUrl ? (
                      <a href={detail.candidate.portfolioUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        Open portfolio <ExternalLink className="size-4" />
                      </a>
                    ) : <p className="mt-1 text-sm text-neutral-500">Not provided</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Current Company</p>
                    <p className="mt-1 text-sm text-neutral-900">{detail.candidate.currentCompany ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Current Title</p>
                    <p className="mt-1 text-sm text-neutral-900">{detail.candidate.currentTitle ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Experience</p>
                    <p className="mt-1 text-sm text-neutral-900">{detail.candidate.totalExperience ?? 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Applied</p>
                    <p className="mt-1 text-sm text-neutral-900">{formatDateTime(detail.appliedAt)}</p>
                  </div>
                </section>

                <section className="rounded-xl border border-neutral-100 bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Resume</p>
                      <p className="text-xs text-neutral-500">Stored resume link for this application.</p>
                    </div>
                    {detail.resumeUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                          <FileDown className="size-4" />
                          Open Resume
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-neutral-500">No resume uploaded</span>
                    )}
                  </div>
                </section>

                <CollapsibleCoverLetter text={detail.coverLetter} />

                <section className="rounded-xl border border-neutral-100 bg-surface p-4">
                  <p className="text-sm font-semibold text-neutral-900">Internal Notes</p>
                  <p className="mt-1 text-xs text-neutral-500">Notes auto-save when the field loses focus.</p>
                  <Textarea
                    className="mt-3 min-h-[140px]"
                    value={notesDraft || detail.internalNotes || ''}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    onFocus={() => setNotesDraft(detail.internalNotes ?? '')}
                    onBlur={() => { void saveNotes(); }}
                  />
                  {updateDetail.isPending ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs text-neutral-500">
                      <Loader2 className="size-3 animate-spin" /> Saving notes
                    </p>
                  ) : null}
                </section>
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                {detail.stageHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-canvas p-6 text-sm text-neutral-500">
                    No activity yet.
                  </div>
                ) : detail.stageHistory.map((item) => {
                  const isApplied = !item.fromStageName;
                  const isStageMove = Boolean(item.fromStageName);
                  return (
                    <div key={item.id} className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-surface p-4">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                        {isApplied ? <FileDown className="size-4" /> : isStageMove ? <ArrowRight className="size-4" /> : <FileText className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-neutral-900">
                            {isApplied ? `Applied to ${detail.jobPostingTitle}` : `Moved from ${item.fromStageName} to ${item.toStageName ?? detail.currentStage}`}
                          </p>
                          <p className="whitespace-nowrap text-xs text-neutral-500">{formatDateTime(item.createdAt)}</p>
                        </div>
                        {item.movedByName ? (
                          <p className="mt-0.5 text-sm text-neutral-600">By {item.movedByName}</p>
                        ) : null}
                        {item.note ? <p className="mt-1.5 text-sm text-neutral-700">{item.note}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
