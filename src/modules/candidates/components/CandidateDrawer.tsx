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

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Mail;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-100 bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-neutral-900">
        <Icon className="size-4 shrink-0 text-neutral-400" />
        <div className="min-w-0 truncate">{value}</div>
      </div>
    </div>
  );
}

function ProfileTab({ detail }: { detail: CandidateApplicationDetail }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem label="Email" icon={Mail} value={detail.candidate.email} />
        <InfoItem label="Phone" icon={Phone} value={detail.candidate.phone ?? 'Not provided'} />
        <InfoItem label="Applied" icon={CalendarClock} value={formatDateTime(detail.appliedAt)} />
        <InfoItem label="Current company" icon={BriefcaseBusiness} value={detail.candidate.currentCompany ?? 'Not provided'} />
        <InfoItem label="Current title" icon={UserRound} value={detail.candidate.currentTitle ?? 'Not provided'} />
        <InfoItem label="Experience" icon={Clock3} value={detail.candidate.totalExperience ?? 'Not provided'} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <section className="rounded-xl border border-neutral-100 bg-surface p-4 md:col-span-1">
          <p className="text-sm font-semibold text-neutral-900">Resume</p>
          <p className="mt-1 text-xs text-neutral-500">Stored resume link for this application.</p>
          <div className="mt-4">
            {detail.resumeUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                  <FileDown className="size-4" />
                  Open resume
                </a>
              </Button>
            ) : (
              <span className="text-sm text-neutral-500">No resume uploaded</span>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-100 bg-surface p-4 md:col-span-2">
          <p className="text-sm font-semibold text-neutral-900">Links</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {detail.candidate.linkedinUrl ? (
              <Button asChild size="sm" variant="outline" className="justify-start">
                <a href={detail.candidate.linkedinUrl} target="_blank" rel="noreferrer">
                  <LinkIcon className="size-4" />
                  LinkedIn
                  <ExternalLink className="ml-auto size-3.5" />
                </a>
              </Button>
            ) : (
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">No LinkedIn profile</p>
            )}
            {detail.candidate.portfolioUrl ? (
              <Button asChild size="sm" variant="outline" className="justify-start">
                <a href={detail.candidate.portfolioUrl} target="_blank" rel="noreferrer">
                  <FileText className="size-4" />
                  Portfolio
                  <ExternalLink className="ml-auto size-3.5" />
                </a>
              </Button>
            ) : (
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">No portfolio link</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FeedbackTable({ event }: { event: ApplicationInterviewEvent }) {
  const feedbacks = event.feedbacks ?? [];
  if (feedbacks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-canvas px-3 py-3 text-sm text-neutral-500">
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
    <div className="overflow-hidden rounded-lg border border-neutral-100">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-3 py-2">Assigned by</th>
              <th className="px-3 py-2">Status</th>
              {categories.map((category) => (
                <th key={category.categoryId} className="px-3 py-2">{category.categoryName}</th>
              ))}
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-surface">
            {feedbacks.map((feedback) => (
              <tr key={feedback.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-900">{feedback.memberName}</td>
                <td className="px-3 py-2">
                  <Badge variant={statusTone(feedback.outcome)}>{feedback.outcome}</Badge>
                </td>
                {categories.map((category) => {
                  const value = feedback.values.find((item) => item.categoryId === category.categoryId)?.value;
                  return (
                    <td key={category.categoryId} className="px-3 py-2 text-neutral-700">
                      {value === null || value === undefined || value === '' ? '-' : String(value)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 font-mono text-[13px] text-neutral-900">{feedback.score ?? '-'}</td>
                <td className="max-w-[220px] px-3 py-2 text-neutral-600">{feedback.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterviewBlock({ event, index }: { event: ApplicationInterviewEvent; index: number }) {
  const lead = event.participants.find((participant) => !participant.isBackup) ?? event.participants[0];
  const guests = event.participants.filter((participant) => participant.memberId !== lead?.memberId);

  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-neutral-900">Interview {index + 1}</p>
            <Badge variant={statusTone(event.status)}>{event.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {formatDateTime(event.scheduledStartAt)}
            {event.durationMinutes ? ` (${event.durationMinutes} min)` : ''}
          </p>
        </div>
        {event.meetingUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={event.meetingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Meeting
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr]">
        <div className="rounded-lg bg-canvas p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Interview panel</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-900">
              <UserRound className="size-4 text-neutral-400" />
              <span className="truncate">{lead?.name ?? event.createdByName ?? 'Unassigned'}</span>
            </div>
            {guests.length > 0 ? (
              <div className="flex items-start gap-2 text-sm text-neutral-600">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <span>{guests.map((guest) => guest.name).join(', ')}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">No additional guests</p>
            )}
            {event.completedByName ? (
              <div className="flex items-center gap-2 text-sm text-success-text">
                <CheckCircle2 className="size-4" />
                <span>Completed by {event.completedByName}</span>
              </div>
            ) : null}
          </div>
        </div>
        <FeedbackTable event={event} />
      </div>
    </div>
  );
}

function HistoryTab({ detail }: { detail: CandidateApplicationDetail }) {
  const timeline = useMemo(() => buildTimeline(detail), [detail]);

  return (
    <div className="relative pl-5">
      <div className="absolute bottom-8 left-[15px] top-4 w-px bg-neutral-200" />
      <div className="space-y-5">
        {timeline.map((entry) => (
          <div key={entry.id} className="relative">
            <span className="absolute -left-[22px] top-4 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-surface shadow-[var(--shadow-1)]">
              {entry.type === 'applied' ? <FileDown className="size-4 text-primary" /> : <ArrowRight className="size-4 text-neutral-500" />}
            </span>
            <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {entry.type === 'applied'
                      ? `Applied to ${detail.jobPostingTitle}`
                      : `Moved to ${entry.stageName}`}
                  </p>
                  {entry.type === 'stage' && entry.history.movedByName ? (
                    <p className="mt-1 text-sm text-neutral-600">by {entry.history.movedByName}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-neutral-700">{formatDate(entry.at)}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(entry.at)}</p>
                </div>
              </div>

              {entry.type === 'stage' && entry.history.note ? (
                <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-neutral-700">{entry.history.note}</p>
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
  note: CandidateApplicationNote;
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const initials = candidateInitials(note.authorName);

  return (
    <section className="rounded-xl border border-neutral-100 bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-ghost text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{note.authorName}</p>
              <p className="text-xs text-neutral-500">{formatDateTime(note.updatedAt)}</p>
            </div>
            {note.canEdit ? (
              <Badge variant="outline">
                <Pencil className="mr-1 size-3" />
                Editable
              </Badge>
            ) : null}
          </div>

          {note.canEdit ? (
            <div className="mt-3">
              <Textarea
                className="min-h-[120px] resize-y"
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
  detail: CandidateApplicationDetail;
  createNote: ReturnType<typeof useCreateCandidateApplicationNote>;
  updateNote: ReturnType<typeof useUpdateCandidateApplicationNote>;
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
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
      <section className="rounded-xl border border-neutral-100 bg-surface p-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" />
          <p className="text-sm font-semibold text-neutral-900">Add internal note</p>
        </div>
        <Textarea
          className="mt-3 min-h-[260px] resize-y"
          placeholder="Write a note for the hiring team..."
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={() => { void handleCreate(); }} disabled={createNote.isPending || !composer.trim()}>
            <Save className="size-4" />
            {createNote.isPending ? 'Saving' : 'Save note'}
          </Button>
        </div>
      </section>

      <div className="space-y-3">
        {(detail.notes ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-canvas p-6 text-sm text-neutral-500">
            No internal notes yet.
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
  orgSlug: string;
  memberId: string;
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      <DialogContent className="flex max-h-[88vh] w-[min(1120px,96vw)] max-w-none flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-surface p-0 shadow-[var(--shadow-4)]">
        <DialogHeader className="border-b border-neutral-100 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-ghost text-base font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-2xl font-semibold text-neutral-900">{candidateName}</DialogTitle>
              {detail ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                  <span>{detail.jobPostingTitle}</span>
                  <span className="size-1 rounded-full bg-neutral-300" />
                  <span>{relativeAppliedDate(detail.appliedAt)}</span>
                  <Badge variant={statusTone(detail.status)}>{detail.currentStage}</Badge>
                  {detail.rating ? (
                    <span className="inline-flex items-center gap-1 text-neutral-700">
                      <Star className="size-3.5 fill-warning-text text-warning-text" />
                      {detail.rating}/5
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="grid gap-4 p-6">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
        ) : null}

        {detail ? (
          <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-neutral-100 px-6 py-3">
              <TabsList className="grid w-full max-w-[380px] grid-cols-3 bg-neutral-50">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <ProfileTab detail={detail} />
            </TabsContent>

            <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <HistoryTab detail={detail} />
            </TabsContent>

            <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <NotesTab detail={detail} createNote={createNote} updateNote={updateNote} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
