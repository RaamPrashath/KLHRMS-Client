'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, Loader2, Search, Send } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useAssignStageInterviews,
  useInterviewersSearch,
  usePreviewStageInterviewWarnings,
  useStageWorkspace,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  StageInterviewAssignment,
  StageInterviewWarning,
  StageWorkspaceCandidate,
  StageWorkspaceInterviewer,
} from '@/modules/candidates/types/atsTypes';

interface StageWorkspacePageShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly stageSlug: string;
}

interface AssignmentDraft {
  interviewer: StageWorkspaceInterviewer | null;
  scheduledLocal: string;
}

function initials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

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

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

function candidateName(candidate: StageWorkspaceCandidate): string {
  return `${candidate.candidate.firstName} ${candidate.candidate.lastName}`.trim();
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function InterviewerSelect({
  orgSlug,
  memberId,
  value,
  onSelect,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly value: StageWorkspaceInterviewer | null;
  readonly onSelect: (interviewer: StageWorkspaceInterviewer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const interviewersQuery = useInterviewersSearch(orgSlug, memberId, deferredSearch);
  const interviewers = interviewersQuery.data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-surface px-3 text-left text-sm',
            value ? 'text-neutral-900' : 'text-neutral-400',
          )}
        >
          <span className="truncate">{value ? value.name : 'Search interviewer'}</span>
          <Search className="size-4 text-neutral-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] gap-2 p-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Type name or email"
          className="h-9"
        />
        <div className="max-h-64 overflow-y-auto">
          {interviewersQuery.isLoading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-neutral-500">
              <Loader2 className="size-4 animate-spin" />
              Searching
            </div>
          ) : null}
          {interviewers.map((interviewer) => (
            <button
              key={interviewer.memberId}
              type="button"
              className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-neutral-50"
              onClick={() => {
                onSelect(interviewer);
                setOpen(false);
              }}
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary-ghost text-xs text-primary">
                  {initials(interviewer.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-neutral-900">{interviewer.name}</span>
                <span className="block truncate text-xs text-neutral-500">{interviewer.email}</span>
                {interviewer.department ? (
                  <span className="block truncate text-xs text-neutral-400">{interviewer.department}</span>
                ) : null}
              </span>
            </button>
          ))}
          {!interviewersQuery.isLoading && interviewers.length === 0 ? (
            <p className="p-3 text-sm text-neutral-500">No employees found.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StageWorkspacePageShell({
  orgSlug,
  memberId,
  stageSlug,
}: StageWorkspacePageShellProps) {
  const workspaceQuery = useStageWorkspace(orgSlug, memberId, stageSlug);
  const previewWarnings = usePreviewStageInterviewWarnings(orgSlug, memberId, stageSlug);
  const assignInterviews = useAssignStageInterviews(orgSlug, memberId, stageSlug);
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [warnings, setWarnings] = useState<StageInterviewWarning[]>([]);

  const workspace = workspaceQuery.data;
  const completedAssignments = useMemo<StageInterviewAssignment[]>(() => {
    if (!workspace) return [];
    return workspace.candidates.flatMap((candidate) => {
      const draft = drafts[candidate.applicationId];
      if (!draft?.interviewer || !draft.scheduledLocal) return [];
      return [{
        applicationId: candidate.applicationId,
        interviewerMemberId: draft.interviewer.memberId,
        scheduledStartAt: toIsoFromLocal(draft.scheduledLocal),
        durationMinutes: 30,
      }];
    });
  }, [drafts, workspace]);

  function updateDraft(applicationId: string, patch: Partial<AssignmentDraft>) {
    setDrafts((current) => ({
      ...current,
      [applicationId]: Object.assign(
        { interviewer: null, scheduledLocal: '' },
        current[applicationId],
        patch,
      ),
    }));
  }

  async function handlePreviewWarnings() {
    const result = await previewWarnings.mutateAsync(completedAssignments);
    setWarnings(result.warnings);
    return result.warnings;
  }

  async function handleAssign() {
    if (completedAssignments.length === 0) {
      toast.error('Select at least one interviewer and date/time');
      return;
    }

    try {
      const warningResult = await handlePreviewWarnings();
      if (warningResult.length > 0) {
        toast.warning('Warnings found. Review them, then click Assign Interviews again to override.');
        if (warnings.length === 0) return;
      }
      const result = await assignInterviews.mutateAsync(completedAssignments);
      toast.success(`${result.assignedCount} interview${result.assignedCount === 1 ? '' : 's'} assigned`);
      setDrafts({});
      setWarnings([]);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to assign interviews'));
    }
  }

  const warningMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const warning of warnings) {
      map.set(warning.applicationId, warning.messages);
    }
    return map;
  }, [warnings]);

  if (workspaceQuery.isLoading) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">
          Loading stage workspace
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">
          Stage workspace was not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas px-6 py-6">
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href={`/${orgSlug}/candidates`}>
            <ChevronLeft className="size-4" />
            Pipeline
          </Link>
        </Button>
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">{workspace.jobPosting.title}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
              {workspace.stage.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              Stage operations workspace for interviewer assignment and interview scheduling.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Candidates</p>
              <p className="mt-1 font-mono text-xl text-neutral-900">{workspace.candidateCount}</p>
            </div>
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Date</p>
              <p className="mt-1 text-sm text-neutral-700">Not set</p>
            </div>
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Mode</p>
              <p className="mt-1 text-sm text-neutral-700">Direct assignment</p>
            </div>
          </div>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mb-4 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4" />
            <div>
              <p className="font-medium">Review scheduling warnings</p>
              <p className="mt-1">These do not block assignment. Click Assign Interviews again to override.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-neutral-900">Candidate assignments</h2>
            <p className="text-sm text-neutral-500">Assign one interviewer and interview time per candidate.</p>
          </div>
          <div className="flex gap-2">
            {/* <Button
              type="button"
              variant="outline"
              onClick={handlePreviewWarnings}
              disabled={completedAssignments.length === 0 || previewWarnings.isPending}
            >
              {previewWarnings.isPending ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              Check warnings
            </Button> */}
            <Button
              type="button"
              onClick={handleAssign}
              disabled={completedAssignments.length === 0 || assignInterviews.isPending || previewWarnings.isPending}
            >
              {assignInterviews.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Assign Interviews
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-canvas hover:bg-canvas">
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Candidate
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Interviewer
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Date and time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspace.candidates.map((candidate) => {
              const draft = drafts[candidate.applicationId];
              const rowWarnings = warningMap.get(candidate.applicationId) ?? [];
              const name = candidateName(candidate);
              return (
                <TableRow key={candidate.applicationId} className="border-neutral-100 hover:bg-canvas">
                  <TableCell className="px-4 py-3">
                    <div className="flex min-w-[260px] items-center gap-3">
                      <Avatar className="size-9 border border-neutral-100">
                        <AvatarFallback className="bg-primary-ghost text-xs font-semibold text-primary">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{name}</p>
                        <p className="truncate text-xs text-neutral-500">{candidate.candidate.email}</p>
                        <p className="truncate text-xs text-neutral-400">{candidate.jobTitle}</p>
                        {candidate.currentAssignment ? (
                          <p className="mt-1 text-xs text-info-text">
                            Assigned to {candidate.currentAssignment.interviewer?.name ?? 'interviewer'} at{' '}
                            {formatDateTime(candidate.currentAssignment.scheduledStartAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[280px] px-4 py-3">
                    <InterviewerSelect
                      orgSlug={orgSlug}
                      memberId={memberId}
                      value={draft?.interviewer ?? null}
                      onSelect={(interviewer) =>
                        updateDraft(candidate.applicationId, {
                          interviewer,
                          scheduledLocal:
                            draft?.scheduledLocal ??
                            (candidate.currentAssignment
                              ? toLocalDateTimeInput(candidate.currentAssignment.scheduledStartAt)
                              : ''),
                        })
                      }
                    />
                    {rowWarnings.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {rowWarnings.map((message) => (
                          <p key={message} className="text-xs text-warning-text">{message}</p>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-[220px] px-4 py-3">
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                      <Input
                        type="datetime-local"
                        value={draft?.scheduledLocal ?? (candidate.currentAssignment ? toLocalDateTimeInput(candidate.currentAssignment.scheduledStartAt) : '')}
                        onChange={(event) => updateDraft(candidate.applicationId, { scheduledLocal: event.target.value })}
                        className="h-10 pl-9"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {workspace.candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-28 text-center text-sm text-neutral-500">
                  No candidates are currently in this stage.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
