'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Loader2, Play, RotateCcw, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

type PendingGoogleAction =
  | { kind: 'schedule'; interview: MyInterview }
  | { kind: 'start'; interview: MyInterview };

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

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message
      : fallback;
  } catch {
    return error.message || fallback;
  }
}

function isGoogleConnectError(error: unknown): boolean {
  const message = readActionError(error, '').toLowerCase();
  return message.includes('connect a google account') || message.includes('reconnect google');
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

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

function colWidth(id: string): string {
  const map: Record<string, string> = {
    candidate: 'w-[26%]',
    position: 'w-[22%]',
    current: 'w-[20%]',
    status: 'w-[14%]',
  };
  return map[id] ?? 'w-[14%]';
}

function colCellPadding(id: string): string {
  if (id === 'candidate') return 'pl-6 pr-3';
  return 'px-3';
}

function colHeadPadding(id: string): string {
  if (id === 'candidate') return 'pl-6 pr-3';
  return 'px-3';
}

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
  const [pendingGoogleAction, setPendingGoogleAction] = useState<PendingGoogleAction | null>(null);
  const pendingGoogleStorageKey = useMemo(
    () => `interviews-google-pending:${orgSlug}:${memberId}`,
    [memberId, orgSlug],
  );
  const interviewsQuery = useFetchMyInterviews(orgSlug, memberId);
  const acceptInterview = useAcceptInterview(orgSlug, memberId);
  const bookCandidateSlot = useBookCandidateProposedSlot(orgSlug, memberId);
  const rejectInterview = useRejectInterview(orgSlug, memberId);
  const startInterview = useStartInterviewMeeting(orgSlug, memberId, null);
  const completeInterview = useCompleteInterviewMeeting(orgSlug, memberId, null);

  // ── Search & pagination state ─────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const checkGoogleAccess = useCallback(async (): Promise<boolean> => {
    const result = await authClient.listAccounts();
    if (result.error) return false;
    const accounts = readAuthAccounts(result.data);
    const googleAccount = accounts.find((account) => account.providerId === 'google');
    if (!googleAccount) return false;
    return normalizeGoogleScopes(googleAccount).includes(GOOGLE_CALENDAR_SCOPE);
  }, []);

  const hasGoogleLinked = useCallback(async () => {
    const result = await authClient.listAccounts();
    if (result.error) return false;

    return readAuthAccounts(result.data).some((account) => account.providerId === 'google');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(GOOGLE_CONNECT_RETURN_PARAM)) return;
    url.searchParams.delete(GOOGLE_CONNECT_RETURN_PARAM);
    window.history.replaceState(null, '', url.toString());
    toast.success('Google Calendar connected');

    const storedAction = window.sessionStorage.getItem(pendingGoogleStorageKey);
    if (!storedAction) return;
    window.sessionStorage.removeItem(pendingGoogleStorageKey);

    try {
      const action = JSON.parse(storedAction) as PendingGoogleAction;
      window.setTimeout(() => {
        if (action.kind === 'schedule') {
          setSchedulingInterview(action.interview);
          return;
        }
        startInterview.mutate(
          { applicationId: action.interview.applicationId, eventId: action.interview.eventId },
          {
            onSuccess: (meeting) => {
              toast.success('Interview started');
              const meetingUrl = meeting.meetingUrl ?? action.interview.meetingUrl;
              if (meetingUrl) {
                window.open(meetingUrl, '_blank', 'noopener,noreferrer');
              } else {
                toast.warning('Interview started, but no meeting link is available');
              }
            },
            onError: (error) => {
              toast.error(readActionError(error, 'Could not start this interview'));
            },
          },
        );
      }, 0);
    } catch {
      toast.error('Google connected, but the pending interview action could not be restored');
    }
  }, [pendingGoogleStorageKey, startInterview]);

  const interviews = useMemo(() => interviewsQuery.data?.items ?? [], [interviewsQuery.data?.items]);

  const filteredInterviews = useMemo(() => {
    if (!search.trim()) return interviews;
    const q = search.toLowerCase();
    return interviews.filter(
      (i) =>
        candidateName(i.candidate.firstName, i.candidate.lastName).toLowerCase().includes(q) ||
        i.jobTitle.toLowerCase().includes(q) ||
        i.stageName.toLowerCase().includes(q) ||
        normalizeInterviewStatus(i.status).toLowerCase().includes(q),
    );
  }, [interviews, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInterviews.length / pageSize));

  const paginatedInterviews = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInterviews.slice(start, start + pageSize);
  }, [filteredInterviews, page, pageSize]);

  const columns = useMemo<ColumnDef<MyInterview>[]>(
    () => [
      {
        id: 'candidate',
        header: 'Candidate',
        cell: ({ row }) => (
          <button
            type="button"
            className="flex items-center gap-3 min-w-0 text-left"
            onClick={() => {
              if (row.original.jobSlug) {
                router.push(`/${orgSlug}/candidates/${row.original.jobSlug}/${row.original.applicationId}`);
              }
            }}
          >
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-neutral-900 hover:text-primary transition-colors">
                {candidateName(row.original.candidate.firstName, row.original.candidate.lastName)}
              </p>
              <p className="truncate text-[11px] text-neutral-500">{row.original.candidate.email}</p>
            </div>
          </button>
        ),
      },
      {
        id: 'position',
        header: 'Position',
        cell: ({ row }) =>
          row.original.jobSlug ? (
            <Link
              href={`/${orgSlug}/jobs/${row.original.jobSlug}`}
              className="block truncate text-sm text-neutral-700 transition-colors hover:text-primary"
            >
              {row.original.jobTitle}
            </Link>
          ) : (
            <span className="block truncate text-sm text-neutral-700">{row.original.jobTitle}</span>
          ),
      },
      {
        id: 'current',
        header: 'Current',
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate text-sm text-neutral-700">{row.original.stageName}</span>
            {row.original.scheduledStartAt ? (
              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                {formatDate(row.original.scheduledStartAt)} - {formatTimeRange(row.original)}
              </span>
            ) : row.original.proposedSlots.some((slot) => slot.proposedBy === 'CANDIDATE') ? (
              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                Candidate proposed {row.original.proposedSlots.filter((slot) => slot.proposedBy === 'CANDIDATE').length} slot(s)
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusBadge status={row.original.status} />
          </div>
        ),
      },
    ],
    [orgSlug, router],
  );

  const table = useReactTable({
    data: paginatedInterviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  async function promptGoogleConnect(action: PendingGoogleAction) {
    setPendingGoogleAction(action);
    setGoogleConnectOpen(true);
  }

  async function handleAccept(interview: MyInterview) {
    const hasGoogle = await checkGoogleAccess();
    if (!hasGoogle) {
      await promptGoogleConnect({ kind: 'schedule', interview });
      return;
    }
    setSchedulingInterview(interview);
  }

  async function connectGoogle() {
    try {
      setIsConnectingGoogle(true);
      if (pendingGoogleAction) {
        window.sessionStorage.setItem(pendingGoogleStorageKey, JSON.stringify(pendingGoogleAction));
      }
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set(GOOGLE_CONNECT_RETURN_PARAM, '1');
      const alreadyLinked = await hasGoogleLinked();
      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [GOOGLE_CALENDAR_SCOPE],
        disableRedirect: true,
      });
      if (result.error) {
        if (alreadyLinked && result.error.message?.includes('already linked')) {
          console.log('Requesting additional scopes for existing Google account');
        } else {
          throw new Error(result.error.message ?? 'Google connection failed');
        }
      }

      const data = result.data as { url?: string } | null;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      toast.error('Google did not return a connection URL');
      window.sessionStorage.removeItem(pendingGoogleStorageKey);
    } catch (error) {
      window.sessionStorage.removeItem(pendingGoogleStorageKey);
      setPendingGoogleAction(null);
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
      await promptGoogleConnect({ kind: 'schedule', interview });
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
          if (isGoogleConnectError(error)) {
            void promptGoogleConnect({ kind: 'start', interview });
            return;
          }
          toast.error(readActionError(error, 'Could not start this interview'));
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
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
          My Interviews
        </h1>
      </div>

      <div className="flex flex-col flex-1 mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="flex flex-col gap-2 border-b border-black/[0.04] px-3.5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  placeholder="Search Interviews"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 border-0 bg-canvas px-3 py-2.5 pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
                />
              </div>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="w-full">
            <div>
              <Table className="table-fixed">
                <TableHeader className="bg-canvas/50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            colWidth(header.id),
                            colHeadPadding(header.id),
                            'h-auto py-3 whitespace-nowrap text-[12.5px] font-semibold tracking-wider text-neutral-500',
                            header.id === 'candidate' || header.id === 'position' || header.id === 'current' ? 'text-left' : 'text-center',
                          )}
                        >
                          {header.isPlaceholder
                            ? ''
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                      <TableHead className="w-[18%] py-3 pr-6 pl-3 text-right text-[12.5px] font-semibold tracking-wider text-neutral-500">
                        Action
                      </TableHead>
                    </TableRow>
                  ))}
                </TableHeader>

                <ShadcnTableBody className="bg-surface">
                  {interviewsQuery.isLoading ? (
                    SKELETON_IDS.slice(0, pageSize).map((id) => (
                      <TableRow key={id} className="border-black/4 hover:bg-transparent">
                        <TableCell colSpan={5} className="p-6">
                          <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedInterviews.length === 0 ? (
                    <TableRow className="border-black/4 hover:bg-transparent">
                      <TableCell colSpan={5} className="py-16 text-center text-sm text-neutral-400">
                        No Interviews Found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-black/4 transition-colors hover:bg-black/[0.02]"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              colWidth(cell.column.id),
                              colCellPadding(cell.column.id),
                              'py-3 whitespace-nowrap',
                              cell.column.id === 'candidate' || cell.column.id === 'position' || cell.column.id === 'current' ? 'text-left' : 'text-center',
                            )}
                          >
                            <div
                              className={cn(
                                'flex',
                                cell.column.id === 'candidate' || cell.column.id === 'position' || cell.column.id === 'current'
                                  ? 'justify-start'
                                  : 'justify-center',
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TableCell>
                        ))}

                        <TableCell className="w-[18%] py-3 pr-6 pl-3 text-right">
                          <div className="flex justify-end">
                            <InterviewActionsCell
                              interview={row.original}
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </ShadcnTableBody>
              </Table>
            </div>
          </div>

          {!interviewsQuery.isLoading && filteredInterviews.length > 0 && (
            <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-neutral-500">Show</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[72px] text-xs" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={String(size)} className="text-xs">
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[13px] text-neutral-500">Per Page</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  {buildPageNumbers(page, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="inline-flex size-8 items-center justify-center text-[13px] text-neutral-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`inline-flex size-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                          p === page
                            ? 'bg-primary text-white'
                            : 'border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50'
                        }`}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
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
          stageSlug: rejectRequest.stageSlug,
          jobSlug: rejectRequest.jobSlug,
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
                setPendingGoogleAction(null);
                window.sessionStorage.removeItem(pendingGoogleStorageKey);
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
