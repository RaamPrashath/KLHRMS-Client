'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, Clock, Loader2, Search, Send, Shuffle, Users } from 'lucide-react';
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
  useCreateHiringTeam,
  useDistributeStageInterviews,
  useFetchHiringTeams,
  useInterviewersSearch,
  usePreviewStageInterviewWarnings,
  useStageWorkspace,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  HiringTeam,
  StageInterviewAssignment,
  StageInterviewWarning,
  StageWorkspaceCandidate,
  StageWorkspaceInterviewer,
  TeamDistributionRequest,
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

interface AvailabilityResult {
  messages: string[];
  hasWarnings: boolean;
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

function buildAvailabilityKey(interviewerMemberId: string, scheduledStartAt: string): string {
  return `${interviewerMemberId}::${scheduledStartAt.slice(0, 10)}`;
}

function teamMemberToInterviewer(team: HiringTeam): StageWorkspaceInterviewer[] {
  return team.members.map((member) => ({
    memberId: member.memberId,
    name: member.name ?? member.email ?? 'Team member',
    email: member.email ?? '',
    department: member.role ?? null,
  }));
}

function InterviewerSelect({
  orgSlug,
  memberId,
  value,
  placeholder,
  onSelect,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly value: StageWorkspaceInterviewer | null;
  readonly placeholder?: string;
  readonly onSelect: (interviewer: StageWorkspaceInterviewer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const interviewersQuery = useInterviewersSearch(orgSlug, memberId, search);
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
          <span className="truncate">{value ? value.name : (placeholder ?? 'Search interviewer')}</span>
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
  const distributeInterviews = useDistributeStageInterviews(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const hiringTeamsQuery = useFetchHiringTeams(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const createHiringTeam = useCreateHiringTeam(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);

  const [assignmentMode, setAssignmentMode] = useState<'direct' | 'automatic'>('direct');

  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [warnings, setWarnings] = useState<StageInterviewWarning[]>([]);
  const [warningsReviewed, setWarningsReviewed] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityResult>>({});
  const [availabilityLoadingKeys, setAvailabilityLoadingKeys] = useState<string[]>([]);
  const availabilityInFlightRef = useRef<Set<string>>(new Set());

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customTeamName, setCustomTeamName] = useState('');
  const [customTeamMembers, setCustomTeamMembers] = useState<StageWorkspaceInterviewer[]>([]);
  const [backupMembers, setBackupMembers] = useState<StageWorkspaceInterviewer[]>([]);
  const [teamScheduledLocal, setTeamScheduledLocal] = useState('');
  const [teamDurationMinutes, setTeamDurationMinutes] = useState(30);
  const [teamWarnings, setTeamWarnings] = useState<StageInterviewWarning[]>([]);
  const [teamWarningsReviewed, setTeamWarningsReviewed] = useState(false);

  const workspace = workspaceQuery.data;
  const hiringTeams = useMemo(
    () => hiringTeamsQuery.data?.items ?? [],
    [hiringTeamsQuery.data?.items],
  );
  const selectedTeam = useMemo(
    () => hiringTeams.find((team) => team.id === selectedTeamId) ?? null,
    [hiringTeams, selectedTeamId],
  );
  const selectedApplicationIds = useMemo(
    () => workspace?.candidates.map((candidate) => candidate.applicationId) ?? [],
    [workspace],
  );

  const resolvedTeamMembers = useMemo(() => {
    if (selectedTeam) return teamMemberToInterviewer(selectedTeam);
    return customTeamMembers;
  }, [customTeamMembers, selectedTeam]);

  const completedAssignments = useMemo<StageInterviewAssignment[]>(() => {
    if (!workspace || assignmentMode !== 'direct') return [];
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
  }, [assignmentMode, drafts, workspace]);

  const assignmentsByAvailabilityKey = useMemo(() => {
    const map = new Map<string, StageInterviewAssignment>();
    for (const assignment of completedAssignments) {
      const key = buildAvailabilityKey(assignment.interviewerMemberId, assignment.scheduledStartAt);
      if (!map.has(key)) {
        map.set(key, assignment);
      }
    }
    return map;
  }, [completedAssignments]);

  const warningMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const sourceWarnings = assignmentMode === 'direct' ? warnings : teamWarnings;
    for (const warning of sourceWarnings) {
      map.set(warning.applicationId, warning.messages);
    }
    return map;
  }, [assignmentMode, teamWarnings, warnings]);

  function updateDraft(applicationId: string, patch: Partial<AssignmentDraft>) {
    setDrafts((current) => ({
      ...current,
      [applicationId]: Object.assign(
        { interviewer: null, scheduledLocal: '' },
        current[applicationId],
        patch,
      ),
    }));
    setWarningsReviewed(false);
    setWarnings([]);
  }

  function addCustomTeamMember(interviewer: StageWorkspaceInterviewer) {
    setSelectedTeamId('');
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);
    setCustomTeamMembers((current) => (
      current.some((member) => member.memberId === interviewer.memberId)
        ? current
        : [...current, interviewer]
    ));
  }

  function addBackupMember(interviewer: StageWorkspaceInterviewer) {
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);
    setBackupMembers((current) => (
      current.some((member) => member.memberId === interviewer.memberId)
        ? current
        : [...current, interviewer]
    ));
  }

  useEffect(() => {
    const pendingKeys = [...assignmentsByAvailabilityKey.entries()].filter(
      ([key]) => !availabilityMap[key] && !availabilityInFlightRef.current.has(key),
    );

    if (pendingKeys.length === 0) return;

    for (const [key, assignment] of pendingKeys) {
      availabilityInFlightRef.current.add(key);
      setAvailabilityLoadingKeys((current) => (current.includes(key) ? current : [...current, key]));

      void previewWarnings.mutateAsync([assignment])
        .then((result) => {
          const warning = result.warnings[0];
          setAvailabilityMap((current) => ({
            ...current,
            [key]: {
              messages: warning?.messages ?? [],
              hasWarnings: Boolean(warning?.messages.length),
            },
          }));
        })
        .catch(() => {
          setAvailabilityMap((current) => ({
            ...current,
            [key]: {
              messages: ['Availability check could not be completed right now.'],
              hasWarnings: true,
            },
          }));
        })
        .finally(() => {
          availabilityInFlightRef.current.delete(key);
          setAvailabilityLoadingKeys((current) => current.filter((item) => item !== key));
        });
    }
  }, [assignmentsByAvailabilityKey, availabilityMap, previewWarnings]);

  async function handlePreviewWarnings() {
    const result = await previewWarnings.mutateAsync(completedAssignments);
    setWarnings(result.warnings);
    return result.warnings;
  }

  async function handleAssignDirect() {
    if (completedAssignments.length === 0) {
      toast.error('Select at least one interviewer and date/time');
      return;
    }

    try {
      const previewedWarnings = await handlePreviewWarnings();
      if (previewedWarnings.length > 0 && !warningsReviewed) {
        setWarningsReviewed(true);
        toast.warning('Warnings found. Review them, then click Assign Interviews again to continue.');
        return;
      }

      const result = await assignInterviews.mutateAsync(completedAssignments);
      toast.success(`${result.assignedCount} interview${result.assignedCount === 1 ? '' : 's'} assigned`);
      setDrafts({});
      setWarnings([]);
      setWarningsReviewed(false);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to assign interviews'));
    }
  }

  async function handleDistributeTeam() {
    if (resolvedTeamMembers.length === 0 || !teamScheduledLocal) {
      toast.error('Select a date first, then choose interviewers for the shuffle');
      return;
    }

    try {
      let hiringTeamId = selectedTeam?.id ?? '';

      if (!hiringTeamId) {
        const created = await createHiringTeam.mutateAsync({
          jobPostingId: workspace?.jobPosting.id ?? '',
          name: customTeamName.trim() || `${workspace?.stage.name ?? 'Interview'} shuffle team`,
          description: null,
          members: resolvedTeamMembers.map((member) => ({ memberId: member.memberId })),
        });
        hiringTeamId = created.id;
        setSelectedTeamId(created.id);
      }

      const payload: TeamDistributionRequest = {
        hiringTeamId,
        strategy: 'ROUND_ROBIN',
        applicationIds: selectedApplicationIds,
        scheduledStartAt: toIsoFromLocal(teamScheduledLocal),
        durationMinutes: teamDurationMinutes,
        backupInterviewers: backupMembers.map((member) => member.memberId),
        ignoreWarnings: teamWarningsReviewed,
      };

      const result = await distributeInterviews.mutateAsync({ stageSlug, data: payload });

      if (result.assignedCount === 0 && result.warnings.length > 0 && !teamWarningsReviewed) {
        setTeamWarnings(result.warnings);
        setTeamWarningsReviewed(true);
        toast.warning('Warnings found. Review them, then click Auto Assign again to continue.');
        return;
      }

      toast.success(`${result.assignedCount} interview${result.assignedCount === 1 ? '' : 's'} distributed`);
      setCustomTeamName('');
      setCustomTeamMembers([]);
      setBackupMembers([]);
      setTeamScheduledLocal('');
      setTeamDurationMinutes(30);
      setTeamWarnings([]);
      setTeamWarningsReviewed(false);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to distribute interviews'));
    }
  }

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
    <div className="min-h-full bg-canvas px-8 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-neutral-500 hover:text-neutral-900">
            <Link href={`/${orgSlug}/candidates`}>
              <ChevronLeft className="mr-1 size-4" />
              Pipeline
            </Link>
          </Button>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                {workspace.stage.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-500">{workspace.jobPosting.title}</span>
                <span className="size-1 rounded-full bg-neutral-300" />
                <span className="font-mono text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  {workspace.candidateCount} Candidates
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-xl bg-neutral-100 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('direct')}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                    assignmentMode === 'direct'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700',
                  )}
                >
                  <Users className="size-4" />
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('automatic')}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                    assignmentMode === 'automatic'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700',
                  )}
                >
                  <Shuffle className="size-4" />
                  Automatic
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={assignmentMode}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            {assignmentMode === 'direct' ? (
              <div className="space-y-6">
                {warnings.length > 0 ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-warning-bg bg-warning-bg p-4 text-sm text-warning-text">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 size-4" />
                        <div>
                          <p className="font-semibold">Scheduling Warnings</p>
                          <p className="mt-0.5 text-warning-text/80">These checks are advisory. Review them and click Assign to proceed.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-surface shadow-[var(--shadow-2)]">
                  <div className="flex flex-col gap-4 border-b border-neutral-100 bg-neutral-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Direct Assignment</h2>
                      <p className="text-sm text-neutral-500">Assign interviewers and slots for each candidate manually.</p>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="bg-primary hover:bg-primary-hover shadow-md transition-all active:scale-[0.98]"
                      onClick={handleAssignDirect}
                      disabled={completedAssignments.length === 0 || assignInterviews.isPending}
                    >
                      {assignInterviews.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 size-4" />
                      )}
                      Assign {completedAssignments.length > 0 ? `${completedAssignments.length} ` : ''}Interviews
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-neutral-100 bg-canvas/50 hover:bg-canvas/50">
                          <TableHead className="w-[30%] px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Candidate</TableHead>
                          <TableHead className="w-[25%] px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Interviewer</TableHead>
                          <TableHead className="w-[20%] px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Schedule</TableHead>
                          <TableHead className="w-[25%] px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">Availability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workspace.candidates.map((candidate) => {
                          const draft = drafts[candidate.applicationId];
                          const fallbackSchedule = candidate.currentAssignment
                            ? toLocalDateTimeInput(candidate.currentAssignment.scheduledStartAt)
                            : '';
                          const scheduledLocal = draft?.scheduledLocal ?? fallbackSchedule;
                          const availabilityKey = draft?.interviewer && scheduledLocal
                            ? buildAvailabilityKey(draft.interviewer.memberId, toIsoFromLocal(scheduledLocal))
                            : null;
                          const availability = availabilityKey ? availabilityMap[availabilityKey] : null;
                          const isCheckingAvailability = availabilityKey ? availabilityLoadingKeys.includes(availabilityKey) : false;
                          const rowWarnings = warningMap.get(candidate.applicationId) ?? availability?.messages ?? [];
                          const name = candidateName(candidate);

                          return (
                            <TableRow key={candidate.applicationId} className="group border-b border-neutral-100 transition-colors hover:bg-neutral-50/50">
                              <TableCell className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <Avatar className="size-10 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-primary-ghost text-xs font-bold text-primary">
                                      {initials(name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
                                    <p className="truncate text-xs text-neutral-500">{candidate.candidate.email}</p>
                                    {candidate.currentAssignment ? (
                                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                                        <Clock className="size-3" />
                                        <span>Scheduled: {formatDateTime(candidate.currentAssignment.scheduledStartAt)}</span>
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-[11px] font-medium text-neutral-400">Not scheduled</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-5">
                                <InterviewerSelect
                                  orgSlug={orgSlug}
                                  memberId={memberId}
                                  value={draft?.interviewer ?? null}
                                  onSelect={(interviewer) =>
                                    updateDraft(candidate.applicationId, { interviewer, scheduledLocal })
                                  }
                                />
                              </TableCell>
                              <TableCell className="px-6 py-5">
                                <div className="relative">
                                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                                  <Input
                                    type="datetime-local"
                                    value={scheduledLocal}
                                    onChange={(e) => updateDraft(candidate.applicationId, { scheduledLocal: e.target.value })}
                                    className="h-10 border-neutral-200 pl-9 focus:border-primary focus:ring-primary/20"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-5">
                                {draft?.interviewer && scheduledLocal ? (
                                  <div className="space-y-2">
                                    <div className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight",
                                      isCheckingAvailability ? "bg-neutral-100 text-neutral-500" :
                                      availability?.hasWarnings ? "bg-warning-bg text-warning-text" : "bg-success-bg text-success-text"
                                    )}>
                                      {isCheckingAvailability ? (
                                        <Loader2 className="size-3 animate-spin" />
                                      ) : availability?.hasWarnings ? (
                                        <AlertTriangle className="size-3" />
                                      ) : (
                                        <CheckCircle2 className="size-3" />
                                      )}
                                      {isCheckingAvailability ? 'Checking' : availability?.hasWarnings ? 'Conflict' : 'Available'}
                                    </div>
                                    {rowWarnings.length > 0 && (
                                      <div className="space-y-1">
                                        {rowWarnings.map((m) => (
                                          <p key={m} className="text-[11px] leading-tight text-warning-text">{m}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-400">Awaiting selection</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Automatic Team Shuffle</h2>
                    <p className="mt-1 text-sm text-neutral-500">Configure your hiring team and schedule for an optimized round-robin distribution.</p>
                  </div>
                  <div className="hidden rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary sm:block">
                    {selectedApplicationIds.length} Candidates to Process
                  </div>
                </div>

                <div className="grid gap-8">
                  {/* Step 1: Schedule */}
                  <section className="rounded-2xl border border-neutral-100 bg-surface p-8 shadow-[var(--shadow-1)]">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">1</div>
                      <h3 className="text-lg font-semibold text-neutral-900">Define Schedule</h3>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-700">Start Date & Time</label>
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                          <Input
                            type="datetime-local"
                            value={teamScheduledLocal}
                            onChange={(e) => {
                              setTeamScheduledLocal(e.target.value);
                              setTeamWarnings([]);
                              setTeamWarningsReviewed(false);
                            }}
                            className="h-12 border-neutral-200 pl-10 text-base focus:border-primary focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-700">Duration per Interview</label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min="15"
                            value={teamDurationMinutes}
                            onChange={(e) => setTeamDurationMinutes(parseInt(e.target.value, 10) || 30)}
                            className="h-12 border-neutral-200 text-base focus:border-primary focus:ring-primary/20"
                          />
                          <span className="text-sm font-medium text-neutral-500">minutes</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Step 2: Team Selection */}
                  <section className="rounded-2xl border border-neutral-100 bg-surface p-8 shadow-[var(--shadow-1)]">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">2</div>
                      <h3 className="text-lg font-semibold text-neutral-900">Assemble Hiring Team</h3>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-neutral-700">Team Template</label>
                        <div className="flex flex-wrap gap-2">
                          {hiringTeams.length > 0 ? (
                            hiringTeams.map((team) => (
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  setCustomTeamMembers([]);
                                  setCustomTeamName(team.name);
                                }}
                                className={cn(
                                  "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                                  selectedTeamId === team.id
                                    ? "border-primary bg-primary-ghost text-primary shadow-sm"
                                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                                )}
                              >
                                {team.name}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-neutral-400 italic">No templates found. Create a new team below.</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-xl bg-neutral-50/50 p-6 border border-neutral-100">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-neutral-600 uppercase tracking-wide">Team Name</label>
                            <Input
                              placeholder="e.g. Engineering Final Panel"
                              value={customTeamName}
                              onChange={(e) => {
                                setSelectedTeamId('');
                                setCustomTeamName(e.target.value);
                              }}
                              className="h-10 bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-neutral-600 uppercase tracking-wide">Add Interviewers</label>
                            <InterviewerSelect
                              orgSlug={orgSlug}
                              memberId={memberId}
                              value={null}
                              placeholder="Search employees..."
                              onSelect={addCustomTeamMember}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {resolvedTeamMembers.map((member) => (
                            <div key={member.memberId} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white py-1.5 pl-2 pr-3 text-sm shadow-sm">
                              <Avatar className="size-6">
                                <AvatarFallback className="bg-primary-ghost text-[10px] font-bold text-primary">
                                  {initials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-neutral-700">{member.name}</span>
                              {!selectedTeam && (
                                <button
                                  type="button"
                                  onClick={() => setCustomTeamMembers(m => m.filter(x => x.memberId !== member.memberId))}
                                  className="ml-1 text-neutral-400 hover:text-destructive"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          {resolvedTeamMembers.length === 0 && (
                            <p className="text-xs text-neutral-400 py-2">Add at least one interviewer to start the shuffle.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Step 3: Backups */}
                  <section className="rounded-2xl border border-neutral-100 bg-surface p-8 shadow-[var(--shadow-1)]">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">3</div>
                      <h3 className="text-lg font-semibold text-neutral-900">Backup Support <span className="text-sm font-normal text-neutral-500 ml-2">(Optional)</span></h3>
                    </div>
                    <p className="mb-6 text-sm text-neutral-500">Backups are automatically promoted if a primary interviewer has a conflict later.</p>
                    
                    <div className="space-y-4">
                      <InterviewerSelect
                        orgSlug={orgSlug}
                        memberId={memberId}
                        value={null}
                        placeholder="Add backup interviewer..."
                        onSelect={addBackupMember}
                      />
                      <div className="flex flex-wrap gap-2">
                        {backupMembers.map((member) => (
                          <div key={member.memberId} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white py-1.5 pl-2 pr-3 text-sm shadow-sm">
                            <Avatar className="size-6">
                              <AvatarFallback className="bg-info-bg text-[10px] font-bold text-info-text">
                                {initials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-neutral-700">{member.name}</span>
                            <button
                              type="button"
                              onClick={() => setBackupMembers(m => m.filter(x => x.memberId !== member.memberId))}
                              className="ml-1 text-neutral-400 hover:text-destructive"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Summary & Execution */}
                  <div className="mt-4 flex flex-col gap-6 rounded-3xl border-2 border-neutral-900 bg-neutral-900 p-10 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <h4 className="text-2xl font-bold">Ready to shuffle?</h4>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-neutral-400">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg text-white">{selectedApplicationIds.length}</span>
                          <span className="text-xs uppercase tracking-widest font-semibold">Candidates</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg text-white">{resolvedTeamMembers.length}</span>
                          <span className="text-xs uppercase tracking-widest font-semibold">Interviewers</span>
                        </div>
                        {teamScheduledLocal && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-4" />
                            <span className="text-sm font-medium text-neutral-200">{formatDateTime(toIsoFromLocal(teamScheduledLocal))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="ghost"
                        size="lg"
                        className="text-neutral-400 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setSelectedTeamId('');
                          setCustomTeamName('');
                          setCustomTeamMembers([]);
                          setBackupMembers([]);
                          setTeamScheduledLocal('');
                          setTeamDurationMinutes(30);
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary-hover px-10 text-lg font-bold shadow-xl transition-all active:scale-95"
                        disabled={resolvedTeamMembers.length === 0 || !teamScheduledLocal || distributeInterviews.isPending}
                        onClick={handleDistributeTeam}
                      >
                        {distributeInterviews.isPending ? (
                          <Loader2 className="mr-2 size-5 animate-spin" />
                        ) : (
                          <Shuffle className="mr-2 size-5" />
                        )}
                        Execute Shuffle
                      </Button>
                    </div>
                  </div>

                  {teamWarnings.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-warning-bg bg-warning-bg/50 p-6"
                    >
                      <div className="mb-4 flex items-center gap-2 text-warning-text">
                        <AlertTriangle className="size-5" />
                        <h4 className="font-bold uppercase tracking-wider text-xs">Conflicts Detected</h4>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {teamWarnings.slice(0, 6).map((w, i) => (
                          <div key={i} className="rounded-lg bg-white/50 p-3 text-xs text-warning-text border border-warning-bg">
                            {w.messages[0]}
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs font-medium text-warning-text/80">
                        Review the conflicts above. You can still proceed by clicking Execute Shuffle again.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
