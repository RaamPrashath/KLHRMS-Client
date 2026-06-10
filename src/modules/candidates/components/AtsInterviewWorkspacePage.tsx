'use client';

import { AlertTriangle, CalendarDays, CalendarPlus, ChevronLeft, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authClient } from '@/lib/auth-client';
import {
  useAssignStageInterviews,
  useInterviewersSearch,
  usePreviewStageInterviewWarnings,
  useStageWorkspaceByJobSlug,
} from '@/modules/candidates/hooks/useAtsPipeline';
import { createInterviewMeetingAction } from '@/modules/candidates/api/atsServerActions';
import type { StageWorkspaceCandidate, StageWorkspaceInterviewer } from '@/modules/candidates/types/atsTypes';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_CONNECT_RETURN_PARAM = 'atsGoogleConnected';

function normalizeGoogleScopes(account: { scope?: unknown; scopes?: unknown }): string[] {
  if (Array.isArray(account.scopes)) {
    return account.scopes.filter((scope): scope is string => typeof scope === 'string');
  }
  if (typeof account.scopes === 'string') {
    return account.scopes.split(/[,\s]+/).filter(Boolean);
  }
  if (typeof account.scope === 'string') {
    return account.scope.split(/[,\s]+/).filter(Boolean);
  }
  return [];
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

function deriveStatus(candidate: StageWorkspaceCandidate): string {
  if (!candidate.currentAssignment) return 'Unassigned';
  const status = candidate.currentAssignment.status;
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'RESCHEDULED') return 'Scheduled';
  if (status === 'SCHEDULED') return 'Scheduled';
  return status;
}

export function AtsInterviewWorkspacePage({
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
}) {
  const workspaceQuery = useStageWorkspaceByJobSlug(orgSlug, memberId, jobSlug, stageSlug);
  const previewWarnings = usePreviewStageInterviewWarnings(orgSlug, memberId, stageSlug);
  const assignInterview = useAssignStageInterviews(orgSlug, memberId, stageSlug);

  const [selectedCandidate, setSelectedCandidate] = useState<StageWorkspaceCandidate | null>(null);
  const [search, setSearch] = useState('');
  const [selectedInterviewer, setSelectedInterviewer] = useState<StageWorkspaceInterviewer | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [hasGoogleAccess, setHasGoogleAccess] = useState(false);
  const [googleAccessLoading, setGoogleAccessLoading] = useState(true);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const interviewersQuery = useInterviewersSearch(orgSlug, memberId, search);
  const pendingConnectKeyRef = useRef(`ats-google-connect:${orgSlug}`);

  const workspace = workspaceQuery.data;

  useEffect(() => {
    authClient.listAccounts().then((result) => {
      if (result.error) {
        setHasGoogleAccess(false);
        setGoogleAccessLoading(false);
        return;
      }
      const accounts = Array.isArray(result.data) ? result.data : [];

      const googleAccount = accounts.find(
        (account: { providerId?: unknown; scope?: unknown; scopes?: unknown }) =>
          account.providerId === 'google'
      );

      if (!googleAccount) {
        setHasGoogleAccess(false);
        setGoogleAccessLoading(false);
        return;
      }

      const hasCalendar = normalizeGoogleScopes(googleAccount).includes(GOOGLE_CALENDAR_SCOPE);

      setHasGoogleAccess(hasCalendar);
      setGoogleAccessLoading(false);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(GOOGLE_CONNECT_RETURN_PARAM)) return;
    url.searchParams.delete(GOOGLE_CONNECT_RETURN_PARAM);
    window.history.replaceState(null, '', url.toString());
    toast.success('Google Calendar connected');
    queueMicrotask(() => setHasGoogleAccess(true));
  }, []);

  async function connectGoogle() {
    try {
      setIsConnectingGoogle(true);
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set(GOOGLE_CONNECT_RETURN_PARAM, '1');
      sessionStorage.setItem(pendingConnectKeyRef.current, '1');

      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [GOOGLE_CALENDAR_SCOPE],
        disableRedirect: false,
      });

      if (result.error && !result.error.message?.includes('already linked')) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      sessionStorage.removeItem(pendingConnectKeyRef.current);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Google Calendar';

      if (errorMessage.includes('different_user')) {
        toast.error('This Google account is linked to a different user. Please sign out and sign in with the correct account.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  }
  async function checkAvailability(interviewer: StageWorkspaceInterviewer | null, value: string) {
    if (!selectedCandidate || !interviewer || !value) {
      setWarningMessage(null);
      return;
    }
    setAvailabilityLoading(true);
    try {
      const result = await previewWarnings.mutateAsync([
        {
          applicationId: selectedCandidate.applicationId,
          interviewerMemberId: interviewer.memberId,
          scheduledStartAt: toIsoFromLocal(value),
          durationMinutes: 30,
        },
      ]);
      setWarningMessage(result.warnings[0]?.messages?.[0] ?? null);
    } catch {
      setWarningMessage('Could not check availability. Proceed with caution.');
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function confirmAssignment() {
    if (!selectedCandidate || !selectedInterviewer || !scheduledLocal) return;
    try {
      let finalMeetLink = meetLink || null;
      if (hasGoogleAccess && !finalMeetLink) {
        try {
          const meeting = await createInterviewMeetingAction({
            orgSlug,
            memberId,
            applicationId: selectedCandidate.applicationId,
            data: {
              mode: 'SCHEDULE',
              scheduledStartAt: toIsoFromLocal(scheduledLocal),
              durationMinutes: 30,
            },
          });
          finalMeetLink = meeting.meetingUrl;
        } catch {
          toast.warning('Could not auto-create meeting. Assignment will proceed without a meeting link.');
        }
      }
      await assignInterview.mutateAsync([
        {
          applicationId: selectedCandidate.applicationId,
          interviewerMemberId: selectedInterviewer.memberId,
          scheduledStartAt: toIsoFromLocal(scheduledLocal),
          durationMinutes: 30,
          meetLink: finalMeetLink,
        },
      ]);
      await workspaceQuery.refetch();
      toast.success('Interview assigned');
      setSelectedCandidate(null);
      setSelectedInterviewer(null);
      setScheduledLocal('');
      setMeetLink('');
      setWarningMessage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign interview');
    }
  }

  if (workspaceQuery.isLoading) {
    return <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">Loading interview workspace…</div>;
  }

  if (workspaceQuery.error || !workspace) {
    return <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">This stage no longer exists or is not an interview workspace.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-neutral-500 hover:text-neutral-900">
          <Link href={`/${orgSlug}/candidates/${jobSlug}`}>
            <ChevronLeft className="mr-1 size-4" />
            Back to Pipeline
          </Link>
        </Button>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">{workspace.stage.name}</h1>
        <p className="mt-1 text-[14px] text-neutral-500">{workspace.jobPosting.title} · {workspace.candidateCount} candidates in this stage</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-canvas hover:bg-canvas">
              <TableHead>Candidate</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspace.candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-neutral-500">No candidates in this stage yet.</TableCell>
              </TableRow>
            ) : workspace.candidates.map((candidate) => (
              <TableRow key={candidate.applicationId}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{candidateName(candidate)}</p>
                    <p className="text-xs text-neutral-500">{candidate.candidate.email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[13px] text-neutral-700">{formatDateTime(candidate.appliedAt)}</TableCell>
                <TableCell className="text-sm text-neutral-700">{candidate.currentAssignment?.interviewer?.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-neutral-700">
                  {candidate.currentAssignment?.scheduledStartAt ? formatDateTime(candidate.currentAssignment.scheduledStartAt) : '—'}
                </TableCell>
                <TableCell className="text-sm text-neutral-700">{deriveStatus(candidate)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setSelectedInterviewer(candidate.currentAssignment?.interviewer ?? null);
                      setScheduledLocal(candidate.currentAssignment?.scheduledStartAt ? toLocalDateTimeInput(candidate.currentAssignment.scheduledStartAt) : '');
                      setWarningMessage(null);
                    }}
                  >
                    {candidate.currentAssignment ? 'Reassign' : 'Assign'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selectedCandidate !== null} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="rounded-2xl border border-neutral-100 bg-surface sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Interview — {selectedCandidate ? candidateName(selectedCandidate) : ''}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Search Interviewer</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search by name or email" />
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-neutral-100 bg-canvas p-2">
                {interviewersQuery.isLoading ? <p className="text-sm text-neutral-500">Loading interviewers…</p> : null}
                {(interviewersQuery.data?.items ?? []).map((interviewer) => (
                  <button
                    key={interviewer.memberId}
                    type="button"
                    className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left ${selectedInterviewer?.memberId === interviewer.memberId ? 'bg-primary-ghost text-primary' : 'hover:bg-neutral-50'}`}
                    onClick={() => {
                      setSelectedInterviewer(interviewer);
                      void checkAvailability(interviewer, scheduledLocal);
                    }}
                  >
                    <span>
                      <span className="block text-sm font-medium">{interviewer.name}</span>
                      <span className="block text-xs text-neutral-500">{interviewer.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {warningMessage ? (
              <div className="rounded-xl border border-warning-bg bg-warning-bg/50 p-3 text-sm text-warning-text">
                <span className="inline-flex items-center gap-2"><AlertTriangle className="size-4" />{warningMessage}</span>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !scheduledLocal && 'text-neutral-400')}
                    >
                      <CalendarDays className="mr-2 size-4" />
                      {scheduledLocal ? format(new Date(scheduledLocal), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledLocal ? new Date(scheduledLocal) : undefined}
                      disabled={
                        workspace?.stage.dueDate
                          ? { after: new Date(workspace.stage.dueDate) }
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const existing = scheduledLocal ? new Date(scheduledLocal) : new Date();
                          existing.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                          const local = new Date(existing.getTime() - existing.getTimezoneOffset() * 60_000);
                          const value = local.toISOString().slice(0, 16);
                          setScheduledLocal(value);
                          void checkAvailability(selectedInterviewer, value);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {workspace?.stage.dueDate ? (
                  <p className="text-xs text-neutral-500">Dates after {format(new Date(workspace.stage.dueDate), 'PP')} are disabled (stage due date).</p>
                ) : null}
              </div>
              <label className="space-y-2 text-sm font-medium text-neutral-700">
                Time
                <Input
                  type="time"
                  value={scheduledLocal ? scheduledLocal.slice(11, 16) : ''}
                  onChange={(event) => {
                    const datePart = scheduledLocal ? scheduledLocal.slice(0, 11) : new Date().toISOString().slice(0, 11);
                    const value = `${datePart}${event.target.value}`;
                    setScheduledLocal(value);
                    void checkAvailability(selectedInterviewer, value);
                  }}
                />
              </label>
            </div>

            {googleAccessLoading ? (
              <p className="inline-flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="size-3 animate-spin" />Checking Google Calendar access...</p>
            ) : hasGoogleAccess ? (
              <div className="rounded-xl border border-success-bg bg-success-bg/20 p-3 text-sm text-success-text">
                <span className="inline-flex items-center gap-2 font-medium">Google Calendar connected - Meet link will be auto-created.</span>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-neutral-100 bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Meeting Link</p>
                    <p className="text-xs text-neutral-500">Paste a meeting link or connect Google Calendar to auto-create.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={isConnectingGoogle} onClick={connectGoogle}>
                    <CalendarPlus className="mr-1.5 size-4" />
                    {isConnectingGoogle ? 'Connecting...' : 'Connect Google'}
                  </Button>
                </div>
                <Input value={meetLink} onChange={(event) => setMeetLink(event.target.value)} placeholder="https://meet.google.com/... or paste manually" />
              </div>
            )}

            {availabilityLoading ? (
              <p className="inline-flex items-center gap-2 text-xs text-neutral-500"><Loader2 className="size-3 animate-spin" />Checking availability…</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedCandidate(null)}>Cancel</Button>
            <Button type="button" disabled={!selectedInterviewer || !scheduledLocal || assignInterview.isPending} onClick={confirmAssignment}>
              {assignInterview.isPending ? 'Saving…' : 'Confirm & Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
