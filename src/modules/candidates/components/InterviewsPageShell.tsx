'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, Check, Clock, Loader2, Play, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CandidateSlotReviewDialog } from '@/modules/candidates/components/CandidateSlotReviewDialog';
import { SchedulingModal } from '@/modules/candidates/components/SchedulingModal';
import { CompleteInterviewDialog } from '@/modules/candidates/components/CompleteInterviewDialog';
import { RejectInterviewDialog } from '@/modules/candidates/components/RejectInterviewDialog';
import { authClient } from '@/lib/auth-client';
import {
  useBookCandidateProposedSlot,
  useAcceptInterview,
  useCompleteInterviewMeeting,
  useFetchMyInterviews,
  useRejectInterview,
  useStartInterviewMeeting,
} from '@/modules/candidates/hooks/useAtsPipeline';
import { cn } from '@/lib/utils';
import type { MyInterview, RejectInterviewRequest } from '@/modules/candidates/types/atsTypes';

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

function readAuthAccounts(data: unknown): Array<{ providerId?: unknown; scope?: unknown; scopes?: unknown }> {
  return Array.isArray(data)
    ? data.filter((item): item is { providerId?: unknown; scope?: unknown; scopes?: unknown } => typeof item === 'object' && item !== null)
    : [];
}

function candidateName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatTimeRange(interview: MyInterview): string {
  if (!interview.scheduledStartAt || !interview.scheduledEndAt) return 'No slot selected';
  const formatter = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${formatter.format(new Date(interview.scheduledStartAt))} - ${formatter.format(new Date(interview.scheduledEndAt))}`;
}

function isScheduledToday(interview: MyInterview): boolean {
  if (!interview.scheduledStartAt) return false;
  const nowParts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
  const interviewParts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(interview.scheduledStartAt));
  return nowParts === interviewParts;
}

function normalizeInterviewStatus(status: string): string {
  return status.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function statusMeta(status: string): { label: string; className: string } {
  switch (normalizeInterviewStatus(status)) {
    case 'PENDING':
    case 'PENDING_ACCEPTANCE':
      return { label: 'Pending acceptance', className: 'bg-warning-bg text-warning-text border-warning-border' };
    case 'CANDIDATE_PENDING':
    case 'ACCEPTED':
    case 'PENDING_CANDIDATE':
    case 'PENDING_CANDIDATE_ACCEPTANCE':
      return { label: 'Candidate Pending', className: 'bg-warning-bg text-warning-text border-warning-border' };
    case 'PENDING_INTERVIEWER':
      return { label: 'Pending interviewer', className: 'bg-info-bg text-info-text border-info-border' };
    case 'SCHEDULED':
      return { label: 'Scheduled', className: 'bg-info-bg text-info-text border-info-border' };
    case 'ONGOING':
      return { label: 'Ongoing', className: 'bg-warning-bg text-warning-text border-warning-border' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-success-bg text-success-text border-success-border' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-destructive-bg text-destructive-text border-destructive-border' };
    case 'CLOSED':
      return { label: 'Closed', className: 'bg-neutral-50 text-neutral-500 border-neutral-100' };
    default:
      return {
        label: status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        className: 'bg-neutral-50 text-neutral-500 border-neutral-100',
      };
  }
}

function StatusBadge({ status }: { readonly status: string }) {
  const meta = statusMeta(status);
  return (
    <Badge variant="outline" className={cn('h-6 rounded-full px-2.5 text-xs font-medium', meta.className)}>
      {normalizeInterviewStatus(status) === 'ONGOING' ? (
        <span className="mr-0.5 size-1.5 rounded-full bg-warning-text" />
      ) : null}
      {meta.label}
    </Badge>
  );
}

function InterviewActionsCell({
  interview,
  onAccept,
  onReject,
  onSchedule,
  onReviewCandidateSlots,
  onStart,
  onComplete,
  isAccepting,
  isRejecting,
  isBookingSlot,
  isStarting,
}: {
  readonly interview: MyInterview;
  readonly onAccept: (interview: MyInterview) => void;
  readonly onReject: (interview: MyInterview) => void;
  readonly onSchedule: (interview: MyInterview) => void;
  readonly onReviewCandidateSlots: (interview: MyInterview) => void;
  readonly onStart: (interview: MyInterview) => void;
  readonly onComplete: (interview: MyInterview) => void;
  readonly isAccepting: boolean;
  readonly isRejecting: boolean;
  readonly isBookingSlot: boolean;
  readonly isStarting: boolean;
}) {
  const status = normalizeInterviewStatus(interview.status);
  const canJoinToday = isScheduledToday(interview);
  const candidateProposedSlots = interview.proposedSlots.filter((slot) => slot.proposedBy === 'CANDIDATE');

  if (status === 'PENDING' || status === 'PENDING_ACCEPTANCE') {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="default" disabled={isAccepting} onClick={() => onAccept(interview)}>
          <Check className="size-4" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive-border bg-destructive-bg text-destructive-text hover:bg-destructive-bg/80"
          disabled={isRejecting}
          onClick={() => onReject(interview)}
        >
          <X className="size-4" />
          {isRejecting ? 'Rejecting' : 'Reject'}
        </Button>
      </div>
    );
  }

  if (status === 'ACCEPTED' || status === 'CANDIDATE_PENDING' || status === 'PENDING_CANDIDATE' || status === 'PENDING_CANDIDATE_ACCEPTANCE' || status === 'PENDING_INTERVIEWER') {
    if (candidateProposedSlots.length > 0) {
      return (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="default"
            disabled={isBookingSlot}
            onClick={() => onReviewCandidateSlots(interview)}
          >
            <CalendarPlus className="size-4" />
            Choose slot
          </Button>
        </div>
      );
    }
    return null;
  }

  if (status === 'COMPLETED') {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onSchedule(interview)}>
          <RotateCcw className="size-4" />
          Reschedule
        </Button>
      </div>
    );
  }

  if (status === 'SCHEDULED') {
    return (
      <div className="flex items-center justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="sm"
                  disabled={!canJoinToday || isStarting}
                  className={cn(!canJoinToday && 'pointer-events-none')}
                  onClick={() => onStart(interview)}
                >
                  {isStarting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Join
                </Button>
              </span>
            </TooltipTrigger>
            {!canJoinToday ? (
              <TooltipContent side="top">
                Scheduled on {formatDateTime(interview.scheduledStartAt)}
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (status === 'ONGOING') {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="default" onClick={() => onComplete(interview)}>
          <Check className="size-4" />
          Complete
        </Button>
      </div>
    );
  }

  if (status === 'REJECTED') return null;
  if (status === 'CLOSED') return null;

  return null;
}

const SKELETON_IDS = Array.from({ length: 8 }, (_, i) => `skeleton-row-${i}`);

export function InterviewsPageShell({
  orgSlug,
  memberId,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
}) {
  const router = useRouter();
  const [rejectRequest, setRejectRequest] = useState<MyInterview | null>(null);
  const [schedulingInterview, setSchedulingInterview] = useState<MyInterview | null>(null);
  const [candidateSlotInterview, setCandidateSlotInterview] = useState<MyInterview | null>(null);
  const [selectedCandidateSlotId, setSelectedCandidateSlotId] = useState<string | null>(null);
  const [completingInterview, setCompletingInterview] = useState<MyInterview | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const pendingSchedulingInterviewRef = useRef<MyInterview | null>(null);
  const interviewsQuery = useFetchMyInterviews(orgSlug, memberId);
  const acceptInterview = useAcceptInterview(orgSlug, memberId);
  const bookCandidateSlot = useBookCandidateProposedSlot(orgSlug, memberId);
  const rejectInterview = useRejectInterview(orgSlug, memberId);
  const startInterview = useStartInterviewMeeting(orgSlug, memberId, null);
  const completeInterview = useCompleteInterviewMeeting(orgSlug, memberId, null);

  const checkGoogleAccess = useCallback(async (): Promise<boolean> => {
    const result = await authClient.listAccounts();
    if (result.error) return false;
    const accounts = readAuthAccounts(result.data);
    const googleAccount = accounts.find((account) => account.providerId === 'google');
    if (!googleAccount) return false;
    return normalizeGoogleScopes(googleAccount).includes(GOOGLE_CALENDAR_SCOPE);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(GOOGLE_CONNECT_RETURN_PARAM)) return;
    url.searchParams.delete(GOOGLE_CONNECT_RETURN_PARAM);
    window.history.replaceState(null, '', url.toString());
    toast.success('Google Calendar connected');
    const pending = pendingSchedulingInterviewRef.current;
    if (pending) {
      pendingSchedulingInterviewRef.current = null;
      setSchedulingInterview(pending);
    }
  }, []);

  if (interviewsQuery.isLoading) {
    return (
      <div className="min-h-full bg-canvas flex flex-col gap-6 flex-1">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight ml-7 mt-7">
          My Interviews
        </h1>
        <div className="flex flex-col mx-7 mb-7">
          <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
              {SKELETON_IDS.map((id) => (
                <div key={id} className="border-b border-black/4 p-6">
                  <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const interviews = interviewsQuery.data?.items ?? [];

  async function promptGoogleConnect(interview: MyInterview) {
    pendingSchedulingInterviewRef.current = interview;
    setGoogleConnectOpen(true);
  }

  async function handleAccept(interview: MyInterview) {
    const hasGoogle = await checkGoogleAccess();
    if (!hasGoogle) {
      await promptGoogleConnect(interview);
      return;
    }
    setSchedulingInterview(interview);
  }

  async function connectGoogle() {
    try {
      setIsConnectingGoogle(true);
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set(GOOGLE_CONNECT_RETURN_PARAM, '1');
      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [GOOGLE_CALENDAR_SCOPE],
        disableRedirect: false,
      });
      if (result.error && !String(result.error.message ?? '').includes('already linked')) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      pendingSchedulingInterviewRef.current = null;
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Calendar');
    } finally {
      setIsConnectingGoogle(false);
    }
  }

  function handleReject(interview: MyInterview) {
    setRejectRequest(interview);
  }

  function submitRejectInterview(payload: RejectInterviewRequest) {
    if (!rejectRequest) return;
    rejectInterview.mutate(
      { eventId: rejectRequest.eventId, data: payload },
      {
        onSuccess: (result) => {
          setRejectRequest(null);
          if (result.status === 'ESCALATED') {
            toast.success('Interview rejected and reassigned.');
          } else {
            toast.success('Interview rejected and unassigned.');
          }
        },
        onError: () => {
          toast.error('Could not reject this interview');
        },
      },
    );
  }

  async function handleSchedule(interview: MyInterview) {
    const hasGoogle = await checkGoogleAccess();
    if (!hasGoogle) {
      await promptGoogleConnect(interview);
      return;
    }
    setSchedulingInterview(interview);
  }

  function handleStart(interview: MyInterview) {
    startInterview.mutate(
      { applicationId: interview.applicationId, eventId: interview.eventId },
      {
        onSuccess: (meeting) => {
          toast.success('Interview started');
          const meetingUrl = meeting.meetingUrl ?? interview.meetingUrl;
          if (meetingUrl) {
            window.open(meetingUrl, '_blank', 'noopener,noreferrer');
          } else {
            toast.warning('Interview started, but no meeting link is available');
          }
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Could not start this interview');
        },
      },
    );
  }

  function handleReviewCandidateSlots(interview: MyInterview) {
    const firstCandidateSlot = interview.proposedSlots.find((slot) => slot.proposedBy === 'CANDIDATE');
    setSelectedCandidateSlotId(firstCandidateSlot?.id ?? null);
    setCandidateSlotInterview(interview);
  }

  async function handleBookCandidateSlot() {
    if (!candidateSlotInterview || !selectedCandidateSlotId) return;
    try {
      await bookCandidateSlot.mutateAsync({
        eventId: candidateSlotInterview.eventId,
        slotId: selectedCandidateSlotId,
      });
      toast.success('Interview slot confirmed');
      setCandidateSlotInterview(null);
      setSelectedCandidateSlotId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not confirm this slot');
    }
  }

  async function handleComplete() {
    if (!completingInterview) return;
    const note = completionNote.trim();
    if (!note) return;

    try {
      await completeInterview.mutateAsync({
        applicationId: completingInterview.applicationId,
        eventId: completingInterview.eventId,
        data: { notes: note },
      });
      toast.success('Interview completed');
      setCompletingInterview(null);
      setCompletionNote('');
    } catch {
      toast.error('Could not complete this interview');
    }
  }

  return (
    <div className="min-h-full bg-canvas flex flex-col gap-6 flex-1">
      <div className="ml-7 mt-7 mr-7 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
            My Interviews
          </h1>
        </div>
      </div>

      <div className="flex flex-col mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto flex flex-col">
          {interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface">
              <Clock className="mb-2 size-8 text-neutral-300" />
              <p className="text-sm text-neutral-400">No interviews assigned</p>
            </div>
          ) : (
            <>
              <div className="grid min-w-[1120px] grid-cols-5 items-center gap-4 border-b border-black/[0.04] bg-canvas/50 px-8 py-3">
                <div className="text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Candidate</div>
                <div className="text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Position</div>
                <div className="text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Current</div>
                <div className="text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Status</div>
                <div className="text-right text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Action</div>
              </div>

              <div className="flex flex-col bg-surface px-4">
                {interviews.map((interview) => (
                  <div
                    key={interview.eventId}
                    className="grid min-w-[1120px] grid-cols-5 items-center gap-4 border-b border-black/4 px-4 py-3 transition-colors hover:bg-black/[0.02]"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="flex items-center gap-3 min-w-0 text-left"
                        onClick={() => {
                          if (interview.jobSlug) {
                            router.push(`/${orgSlug}/candidates/${interview.jobSlug}/${interview.applicationId}`);
                          }
                        }}
                      >
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-neutral-900 hover:text-primary transition-colors">
                            {candidateName(interview.candidate.firstName, interview.candidate.lastName)}
                          </p>
                          <p className="truncate text-[11px] text-neutral-500">{interview.candidate.email}</p>
                        </div>
                      </button>
                    </div>

                    <div className="min-w-0">
                      {interview.jobSlug ? (
                        <Link
                          href={`/${orgSlug}/jobs/${interview.jobSlug}`}
                          className="block truncate text-sm text-neutral-700 transition-colors hover:text-primary"
                        >
                          {interview.jobTitle}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm text-neutral-700">{interview.jobTitle}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="block truncate text-sm text-neutral-700">{interview.stageName}</span>
                      {interview.scheduledStartAt ? (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          {formatDate(interview.scheduledStartAt)} - {formatTimeRange(interview)}
                        </span>
                      ) : interview.proposedSlots.some((slot) => slot.proposedBy === 'CANDIDATE') ? (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          Candidate proposed {interview.proposedSlots.filter((slot) => slot.proposedBy === 'CANDIDATE').length} slot(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <StatusBadge status={interview.status} />
                    </div>

                    <div className="min-w-0">
                      <InterviewActionsCell
                        interview={interview}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onSchedule={handleSchedule}
                        onReviewCandidateSlots={handleReviewCandidateSlots}
                        onStart={handleStart}
                        onComplete={(item) => setCompletingInterview(item)}
                        isAccepting={acceptInterview.isPending}
                        isRejecting={rejectInterview.isPending}
                        isBookingSlot={bookCandidateSlot.isPending}
                        isStarting={startInterview.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <RejectInterviewDialog
        key={rejectRequest?.eventId ?? 'reject-interview-dialog'}
        open={rejectRequest !== null}
        interview={rejectRequest ? {
          eventId: rejectRequest.eventId,
          jobPostingId: rejectRequest.jobPostingId,
          stageId: rejectRequest.stageId,
          candidateName: candidateName(rejectRequest.candidate.firstName, rejectRequest.candidate.lastName),
        } : null}
        orgSlug={orgSlug}
        memberId={memberId}
        isSubmitting={rejectInterview.isPending}
        onOpenChange={(open) => {
          if (!open) setRejectRequest(null);
        }}
        onSubmit={submitRejectInterview}
      />

      <Dialog open={googleConnectOpen} onOpenChange={setGoogleConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-ghost text-primary">
              <CalendarPlus className="size-5" />
            </div>
            <DialogTitle>Connect Google Calendar</DialogTitle>
            <DialogDescription>
              Interview meetings need Google Calendar access to create a Meet link and email the candidate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGoogleConnectOpen(false);
                pendingSchedulingInterviewRef.current = null;
              }}
              disabled={isConnectingGoogle}
            >
              Cancel
            </Button>
            <Button type="button" onClick={connectGoogle} disabled={isConnectingGoogle}>
              {isConnectingGoogle ? 'Opening Google' : 'Connect Google'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SchedulingModal
        key={schedulingInterview?.eventId ?? 'closed-scheduling-modal'}
        interview={schedulingInterview}
        open={schedulingInterview !== null}
        isSubmitting={acceptInterview.isPending}
        onOpenChange={(open) => {
          if (!open) setSchedulingInterview(null);
        }}
        onSubmit={async (payload) => {
          if (!schedulingInterview) return;
          const schedulingStatus = normalizeInterviewStatus(schedulingInterview.status);
          const isReschedule = schedulingStatus === 'SCHEDULED' || schedulingStatus === 'COMPLETED';
          try {
            await acceptInterview.mutateAsync({
              eventId: schedulingInterview.eventId,
              data: payload,
            });
            toast.success(isReschedule ? 'Reschedule slots sent to candidate' : 'Slots sent to candidate');
            setSchedulingInterview(null);
          } catch {
            toast.error(isReschedule ? 'Could not reschedule this interview' : 'Could not send slots');
          }
        }}
      />
      <CandidateSlotReviewDialog
        interview={candidateSlotInterview}
        selectedSlotId={selectedCandidateSlotId}
        isSubmitting={bookCandidateSlot.isPending}
        onSelectedSlotChange={setSelectedCandidateSlotId}
        onOpenChange={(open) => {
          if (!open) {
            setCandidateSlotInterview(null);
            setSelectedCandidateSlotId(null);
          }
        }}
        onSubmit={handleBookCandidateSlot}
      />
      <CompleteInterviewDialog
        key={completingInterview?.eventId ?? 'closed-complete-interview'}
        open={completingInterview !== null}
        candidateName={
          completingInterview
            ? candidateName(completingInterview.candidate.firstName, completingInterview.candidate.lastName)
            : null
        }
        detail={completingInterview ? `${completingInterview.stageName} - ${formatTimeRange(completingInterview)}` : null}
        note={completionNote}
        isSubmitting={completeInterview.isPending}
        onNoteChange={setCompletionNote}
        onOpenChange={(open) => {
          if (!open) {
            setCompletingInterview(null);
            setCompletionNote('');
          }
        }}
        onSubmit={handleComplete}
      />
    </div>
  );
}
