'use client';

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  FileText,
  LinkIcon,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  Save,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react';
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
  useCreateCandidateApplicationNote,
  useUpdateCandidateApplicationNote,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  ApplicationInterviewEvent,
  CandidateApplicationDetail,
  CandidateApplicationNote,
  StageHistoryItem,
} from '@/modules/candidates/types/atsTypes';

type TimelineEntry =
  | { type: 'applied'; id: string; at: string; stageName: string; history?: never; interviews?: never }
  | { type: 'stage'; id: string; at: string; stageName: string; history: StageHistoryItem; interviews: ApplicationInterviewEvent[] };

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
  if (status === 'FINALIZED' || status === 'COMPLETED' || status === 'APPROVED') return 'default';
  if (status === 'PENDING' || status === 'ONGOING') return 'secondary';
  return 'outline';
}

function candidateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C';
}

function buildTimeline(detail: CandidateApplicationDetail): TimelineEntry[] {
  const interviewsByStage = new Map<string, ApplicationInterviewEvent[]>();
  for (const event of detail.interviewEvents ?? []) {
    const current = interviewsByStage.get(event.stageId) ?? [];
    current.push(event);
    interviewsByStage.set(event.stageId, current);
  }

  const stageEntries: TimelineEntry[] = (detail.stageHistory ?? []).map((history) => ({
    type: 'stage',
    id: history.id,
    at: history.createdAt,
    stageName: history.toStageName ?? detail.currentStage,
    history,
    interviews: interviewsByStage.get(history.toStageId) ?? [],
  }));

  const historyStageIds = new Set((detail.stageHistory ?? []).map((history) => history.toStageId));
  for (const event of detail.interviewEvents ?? []) {
    if (historyStageIds.has(event.stageId)) continue;
    stageEntries.push({
      type: 'stage',
      id: `event-stage-${event.stageId}`,
      at: event.scheduledStartAt ?? event.createdAt,
      stageName: event.stageName ?? 'Interview',
      history: {
        id: `event-history-${event.stageId}`,
        fromStageId: null,
        fromStageName: null,
        toStageId: event.stageId,
        toStageName: event.stageName,
        movedByMemberId: null,
        movedByName: event.createdByName,
        note: null,
        createdAt: event.createdAt,
      },
      interviews: [event],
    });
  }

  const appliedEntry: TimelineEntry = {
    type: 'applied',
    id: 'applied',
    at: detail.appliedAt,
    stageName: 'Applied',
  };

  return [...stageEntries, appliedEntry].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly icon: typeof Mail;
}) {
  return (
    <div className="grid grid-cols-[24px_112px_minmax(0,1fr)] items-center gap-3 border-b border-neutral-100 py-3 last:border-b-0">
      <Icon className="size-4 text-neutral-400" />
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="min-w-0 truncate text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function LinkRow({
  label,
  href,
  icon: Icon,
}: {
  readonly label: string;
  readonly href: string | null;
  readonly icon: typeof LinkIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-4 shrink-0 text-neutral-400" />
        <span className="truncate text-sm font-medium text-neutral-900">{label}</span>
      </div>
      {href ? (
        <Button asChild size="sm" variant="ghost" className="h-8 shrink-0 px-2 text-primary">
          <a href={href} target="_blank" rel="noreferrer">
            Open
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      ) : (
        <span className="shrink-0 text-xs text-neutral-500">Not provided</span>
      )}
    </div>
  );
}

function ProfileTab({ detail }: { readonly detail: CandidateApplicationDetail }) {
  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">Candidate dossier</p>
          <Badge variant={statusTone(detail.status)} className="text-xs">{detail.status}</Badge>
        </div>
        <div className="rounded-lg border border-neutral-100 bg-surface px-4">
          <ProfileField label="Email" icon={Mail} value={detail.candidate.email} />
          <ProfileField label="Phone" icon={Phone} value={detail.candidate.phone ?? 'Not provided'} />
          <ProfileField label="Applied" icon={CalendarClock} value={formatDateTime(detail.appliedAt)} />
          <ProfileField label="Company" icon={BriefcaseBusiness} value={detail.candidate.currentCompany ?? 'Not provided'} />
          <ProfileField label="Title" icon={UserRound} value={detail.candidate.currentTitle ?? 'Not provided'} />
          <ProfileField label="Experience" icon={Clock3} value={detail.candidate.totalExperience ?? 'Not provided'} />
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm font-semibold text-neutral-900">Documents and links</p>
        <div className="rounded-lg border border-neutral-100 bg-surface px-4">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileDown className="size-4 shrink-0 text-neutral-400" />
              <span className="truncate text-sm font-medium text-neutral-900">Resume</span>
            </div>
            {detail.resumeUrl ? (
              <Button asChild size="sm" variant="ghost" className="h-8 shrink-0 px-2 text-primary">
                <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                  Open
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : (
              <span className="shrink-0 text-xs text-neutral-500">Not uploaded</span>
            )}
          </div>
          <LinkRow label="LinkedIn" href={detail.candidate.linkedinUrl} icon={LinkIcon} />
          <LinkRow label="Portfolio" href={detail.candidate.portfolioUrl} icon={FileText} />
        </div>
      </section>
    </div>
  );
}

function FeedbackTable({ event }: { readonly event: ApplicationInterviewEvent }) {
  const feedbacks = event.feedbacks ?? [];
  if (feedbacks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-canvas px-3 py-3 text-sm text-neutral-500">
        No marks submitted for this interview yet.
      </div>
    );
  }

  const categories = Array.from(
    new Map(
      feedbacks
        .flatMap((feedback) => feedback.values)
        .map((value) => [value.categoryId, value]),
    ).values(),
  );

  return (
    <div className="overflow-hidden rounded-md border border-neutral-100 bg-surface">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="px-3 py-2 whitespace-nowrap">Assigned by</th>
              <th className="px-3 py-2 whitespace-nowrap">Status</th>
              {categories.map((category) => (
                <th key={category.categoryId} className="px-3 py-2 whitespace-nowrap">{category.categoryName}</th>
              ))}
              <th className="px-3 py-2 whitespace-nowrap">Total</th>
              <th className="px-3 py-2 whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {feedbacks.map((feedback) => (
              <tr key={feedback.id} className="hover:bg-neutral-50 transition-colors">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-900">{feedback.memberName}</td>
                <td className="px-3 py-2">
                  <Badge variant={statusTone(feedback.outcome)} className="text-xs">{feedback.outcome}</Badge>
                </td>
                {categories.map((category) => {
                  const value = feedback.values.find((item) => item.categoryId === category.categoryId)?.value;
                  return (
                    <td key={category.categoryId} className="px-3 py-2 text-neutral-700 text-xs">
                      {value === null || value === undefined || value === '' ? '-' : String(value)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 font-mono text-[12px] text-neutral-900 font-semibold">{feedback.score ?? '-'}</td>
                <td className="max-w-[12.5rem] px-3 py-2 text-neutral-600 text-xs">{feedback.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterviewBlock({ event, index }: { readonly event: ApplicationInterviewEvent; readonly index: number }) {
  const lead = event.participants.find((participant) => !participant.isBackup) ?? event.participants[0];
  const guests = event.participants.filter((participant) => participant.memberId !== lead?.memberId);

  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 transition-colors hover:bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm font-semibold text-neutral-900">Interview {index + 1}</p>
            <Badge variant={statusTone(event.status)} className="text-xs">{event.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            {formatDateTime(event.scheduledStartAt)}
            {event.durationMinutes ? ` - ${event.durationMinutes} min` : ''}
          </p>
        </div>
        {event.meetingUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={event.meetingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Join meeting
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-neutral-100 bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Interview panel</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-neutral-900 font-medium">
              <div className="size-6 rounded-full bg-primary-ghost text-primary flex items-center justify-center text-xs font-semibold">
                <UserRound className="size-3.5" />
              </div>
              <span className="truncate">{lead?.name ?? event.createdByName ?? 'Unassigned'}</span>
            </div>
            {guests.length > 0 ? (
              <div className="flex items-start gap-2.5 text-sm text-neutral-700">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <span className="text-xs">{guests.map((guest) => guest.name).join(', ')}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 ml-7">No additional guests</p>
            )}
            {event.completedByName ? (
              <div className="flex items-center gap-2.5 text-sm text-success-text font-medium mt-2 pt-2 border-t border-neutral-100">
                <CheckCircle2 className="size-4" />
                <span className="text-xs">Completed by {event.completedByName}</span>
              </div>
            ) : null}
          </div>
        </div>
        <FeedbackTable event={event} />
      </div>
    </div>
  );
}

function HistoryTab({ detail }: { readonly detail: CandidateApplicationDetail }) {
  const timeline = useMemo(() => buildTimeline(detail), [detail]);

  return (
    <div className="relative pl-6">
      <div className="absolute bottom-8 left-[11px] top-4 w-px bg-neutral-200" />
      <div className="space-y-6">
        {timeline.map((entry) => (
          <div key={entry.id} className="relative">
            <span className="absolute -left-[25px] top-5 flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-600 shadow-sm">
              {entry.type === 'applied' ? <FileDown className="size-4" /> : <ArrowRight className="size-3.5" />}
            </span>
            <section className="rounded-lg border border-neutral-100 bg-surface p-4 transition-colors hover:bg-neutral-50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    {entry.type === 'applied'
                      ? `Applied to ${detail.jobPostingTitle}`
                      : `Moved to ${entry.stageName}`}
                  </p>
                  {entry.type === 'stage' && entry.history.movedByName ? (
                    <p className="mt-1 text-xs text-neutral-600">by {entry.history.movedByName}</p>
                  ) : null}
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-xs font-semibold text-neutral-900">{formatDate(entry.at)}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(entry.at)}</p>
                </div>
              </div>

              {entry.type === 'stage' && entry.history.note ? (
                <p className="mt-3 rounded-md border border-neutral-100 bg-surface px-3 py-2 text-sm text-neutral-700">{entry.history.note}</p>
              ) : null}

              {entry.type === 'stage' && entry.interviews.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {entry.interviews.map((event, index) => (
                    <InterviewBlock key={event.id} event={event} index={index} />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  draft,
  onDraftChange,
  onSave,
  saving,
}: {
  readonly note: CandidateApplicationNote;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}) {
  const initials = candidateInitials(note.authorName);

  return (
    <section className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 transition-colors hover:bg-surface">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-ghost text-xs font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{note.authorName}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{formatDateTime(note.updatedAt)}</p>
            </div>
            {note.canEdit ? (
              <Badge variant="outline" className="text-xs">
                <Pencil className="mr-1 size-3" />
                Editable
              </Badge>
            ) : null}
          </div>

          {note.canEdit ? (
            <div className="mt-3">
              <Textarea
                className="min-h-25 resize-y"
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={onSave} disabled={saving || !draft.trim() || draft === note.body}>
                  <Save className="size-4" />
                  {saving ? 'Saving' : 'Save note'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{note.body}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function NotesTab({
  detail,
  createNote,
  updateNote,
}: {
  readonly detail: CandidateApplicationDetail;
  readonly createNote: ReturnType<typeof useCreateCandidateApplicationNote>;
  readonly updateNote: ReturnType<typeof useUpdateCandidateApplicationNote>;
}) {
  const [composer, setComposer] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function handleCreate() {
    if (!composer.trim()) return;
    await createNote.mutateAsync({ applicationId: detail.id, body: composer.trim() });
    setComposer('');
  }

  async function handleUpdate(note: CandidateApplicationNote) {
    const body = drafts[note.id]?.trim();
    if (!body || body === note.body) return;
    await updateNote.mutateAsync({ applicationId: detail.id, noteId: note.id, body });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-neutral-100 bg-surface p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-primary-light/20">
            <MessageSquareText className="size-4 text-primary" />
          </div>
          <p className="text-sm font-semibold text-neutral-900">Add internal note</p>
        </div>
        <Textarea
          className="mt-4 min-h-32 resize-y"
          placeholder="Write a note for the hiring team..."
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button 
            size="sm" 
            onClick={() => { void handleCreate(); }} 
            disabled={createNote.isPending || !composer.trim()}
            className="w-full"
          >
            <Save className="size-4" />
            {createNote.isPending ? 'Saving' : 'Save note'}
          </Button>
        </div>
      </section>

      <div className="space-y-4">
        {(detail.notes ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-canvas p-8 text-center">
            <MessageSquareText className="size-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No internal notes yet.</p>
          </div>
        ) : (
          detail.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              draft={drafts[note.id] ?? note.body}
              onDraftChange={(value) => setDrafts((current) => ({ ...current, [note.id]: value }))}
              onSave={() => { void handleUpdate(note); }}
              saving={updateNote.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function CandidateDrawer({
  orgSlug,
  memberId,
  applicationId,
  open,
  onOpenChange,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly applicationId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useCandidateApplicationDetail(orgSlug, memberId, applicationId);
  const createNote = useCreateCandidateApplicationNote(orgSlug, memberId);
  const updateNote = useUpdateCandidateApplicationNote(orgSlug, memberId);
  const detail = detailQuery.data;
  const candidateName = useMemo(
    () => detail ? `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim() : 'Candidate',
    [detail],
  );
  const initials = candidateInitials(candidateName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !bottom-0 !right-0 !left-auto !top-0 z-50 flex h-dvh max-h-dvh w-full !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-none border-0 border-l border-neutral-100 bg-surface p-0 shadow-[var(--shadow-4)] duration-200 data-open:slide-in-from-right-full data-open:zoom-in-100 data-closed:slide-out-to-right-full data-closed:zoom-out-100 sm:w-[40vw]">
        <DialogHeader className="border-b border-neutral-100 bg-surface px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-ghost text-base font-semibold text-primary ring-1 ring-primary-light/40">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-2xl font-semibold text-neutral-900">{candidateName}</DialogTitle>
              {detail ? (
                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">{detail.jobPostingTitle}</span>
                  <span className="h-5 w-px bg-neutral-200" />
                  <span>{relativeAppliedDate(detail.appliedAt)}</span>
                  <Badge variant={statusTone(detail.status)} className="text-xs">{detail.currentStage}</Badge>
                  {detail.rating ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-neutral-900">
                      <Star className="size-4 fill-warning-text text-warning-text" />
                      {detail.rating}/5
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="grid gap-4 p-5">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
        ) : null}

        {detail ? (
          <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-neutral-100 bg-surface px-5 py-3">
              <TabsList className="grid w-full grid-cols-3 gap-4 bg-transparent p-0">
                <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent px-0 py-2 font-semibold text-neutral-600 data-active:border-primary data-active:text-primary data-active:shadow-none">Profile</TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-0 py-2 font-semibold text-neutral-600 data-active:border-primary data-active:text-primary data-active:shadow-none">History</TabsTrigger>
                <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent px-0 py-2 font-semibold text-neutral-600 data-active:border-primary data-active:text-primary data-active:shadow-none">Notes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 data-active:animate-in data-active:fade-in-0 data-active:slide-in-from-bottom-1">
              <ProfileTab detail={detail} />
            </TabsContent>

            <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 data-active:animate-in data-active:fade-in-0 data-active:slide-in-from-bottom-1">
              <HistoryTab detail={detail} />
            </TabsContent>

            <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 data-active:animate-in data-active:fade-in-0 data-active:slide-in-from-bottom-1">
              <NotesTab detail={detail} createNote={createNote} updateNote={updateNote} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
