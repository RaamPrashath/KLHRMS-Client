'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, Clock, Inbox, Loader2, Plus, Search, Send, Shuffle, UserCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { CandidateCard } from '@/modules/candidates/components/CandidateCard';
import { CandidateDrawer } from '@/modules/candidates/components/CandidateDrawer';
import { InterviewerSelectDialog } from '@/modules/candidates/components/InterviewerSelectDialog';
import {
  useAddHiringTeamMember,
  useAssignStageInterviews,
  useCompleteInterviewMeeting,
  useCompleteStage,
  useCreateHiringTeam,
  useDistributeStageInterviews,
  useFetchHiringTeams,
  useInterviewersSearch,
  useMoveInterviewAssignment,
  useReopenStage,
  usePreviewStageInterviewWarnings,
  useRemoveHiringTeamMember,
  useStartInterviewMeeting,
  useStageWorkspace,
  useStageWorkspaceByJobSlug,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  ApplicationInterviewMeeting,
  HiringTeam,
  PipelineApplication,
  PipelineStage,
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
  readonly jobSlug?: string | null;
}

interface AssignmentDraft {
  interviewer: StageWorkspaceInterviewer | null;
  scheduledLocal: string;
}

interface AvailabilityResult {
  messages: string[];
  hasWarnings: boolean;
}

interface AssignmentColumnModel {
  id: string;
  title: string;
  interviewer: StageWorkspaceInterviewer | null;
  candidates: StageWorkspaceCandidate[];
  isBackup?: boolean;
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

function isLockedAssignment(candidate: StageWorkspaceCandidate): boolean {
  const status = candidate.currentAssignment?.status;
  return status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'COMPLETED';
}

function teamMemberToInterviewer(team: HiringTeam): StageWorkspaceInterviewer[] {
  return team.members.map((member) => ({
    memberId: member.memberId,
    name: member.name ?? member.email ?? 'Team member',
    email: member.email ?? '',
    department: member.role ?? null,
  }));
}

function allocationColumnId(memberId: string): string {
  return `interviewer:${memberId}`;
}

function memberIdFromColumnId(columnId: string): string | null {
  return columnId.startsWith('interviewer:') ? columnId.slice('interviewer:'.length) : null;
}

function assignmentToMeeting(candidate: StageWorkspaceCandidate): ApplicationInterviewMeeting | null {
  const assignment = candidate.currentAssignment;
  if (!assignment?.scheduledStartAt || !assignment.scheduledEndAt) return null;

  const status: ApplicationInterviewMeeting['status'] =
    assignment.status === 'ONGOING'
      ? 'ONGOING'
      : assignment.status === 'COMPLETED'
        ? 'COMPLETED'
        : 'PENDING';

  return {
    id: assignment.eventId,
    status,
    scheduledStartAt: assignment.scheduledStartAt,
    scheduledEndAt: assignment.scheduledEndAt,
    meetingUrl: assignment.meetLink,
    interviewerName: assignment.interviewer?.name ?? null,
    completedAt: status === 'COMPLETED' ? assignment.scheduledEndAt : null,
  };
}

function workspaceCandidateToApplication(
  candidate: StageWorkspaceCandidate,
  stage: PipelineStage,
  jobPostingId: string,
): PipelineApplication {
  return {
    id: candidate.applicationId,
    jobPostingId,
    pipelineStageId: stage.id,
    currentStage: stage.name,
    candidate: candidate.candidate,
    score: candidate.score,
    rating: candidate.rating,
    source: candidate.source,
    appliedDate: candidate.appliedAt,
    lastMovedAt: null,
    status: candidate.currentAssignment?.status ?? 'UNASSIGNED',
    resumeUrl: candidate.candidate.resumeUrl,
    interviewMeeting: assignmentToMeeting(candidate),
  };
}

function AllocationCard({
  candidate,
  stage,
  jobPostingId,
  onOpenCandidate,
  onStartInterview,
  onCompleteInterview,
  disabled = false,
}: {
  readonly candidate: StageWorkspaceCandidate;
  readonly stage: PipelineStage;
  readonly jobPostingId: string;
  readonly onOpenCandidate?: (applicationId: string) => void;
  readonly onStartInterview?: (application: PipelineApplication) => void;
  readonly onCompleteInterview?: (
    application: PipelineApplication,
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    },
  ) => void;
  readonly disabled?: boolean;
}) {
  const locked = disabled || isLockedAssignment(candidate);
  const application = workspaceCandidateToApplication(candidate, stage, jobPostingId);

  return (
    <CandidateCard
      application={application}
      onOpen={onOpenCandidate}
      meetingEnabled={Boolean(stage.meetingEnabled && application.interviewMeeting)}
      evaluationCategories={stage.evaluationEnabled ? stage.evaluationCategories : []}
      onStartInterview={onStartInterview}
      onCompleteInterview={onCompleteInterview}
      draggable
      dragLocked={locked}
    />
  );
}

function AssignmentColumn({
  column,
  stage,
  jobPostingId,
  onRemove,
  onOpenCandidate,
  onStartInterview,
  onCompleteInterview,
}: {
  readonly column: AssignmentColumnModel;
  readonly stage: PipelineStage;
  readonly jobPostingId: string;
  readonly onRemove?: (memberId: string) => void;
  readonly onOpenCandidate: (applicationId: string) => void;
  readonly onStartInterview: (application: PipelineApplication) => void;
  readonly onCompleteInterview: (
    application: PipelineApplication,
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    },
  ) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const count = column.candidates.length;
  const isUnassigned = column.id === 'unassigned';

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[320px] shrink-0 flex-col overflow-hidden px-2 pt-2',
        isOver && 'bg-neutral-100/90',
      )}
    >
      <header className="sticky top-0 z-10 mb-3">
        <div className={cn(
          'rounded-xl px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]',
          isUnassigned ? 'border border-dashed border-neutral-300 bg-neutral-50/80' : 'bg-surface',
        )}>
          {/* Header top row: avatar/title + count badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {isUnassigned ? (
                <Inbox className="size-5 shrink-0 text-neutral-400" />
              ) : column.interviewer ? (
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: column.isBackup ? '#F0F5FF' : '#EEEDFE',
                    color: column.isBackup ? '#185FA5' : '#534AB7',
                  }}
                >
                  {initials(column.interviewer.name)}
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold text-neutral-900">
                    {column.title}
                  </h3>
                  {column.isBackup ? (
                    <span className="shrink-0 rounded border border-info-border bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info-text leading-none">
                      Backup
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
                count > 0
                  ? 'bg-primary-ghost text-primary'
                  : 'bg-neutral-100 text-neutral-500',
              )}>
                {count}
              </span>
              {column.interviewer && onRemove ? (
                <button
                  type="button"
                  className="rounded-md p-1 text-neutral-400 hover:bg-neutral-50 hover:text-destructive-text"
                  onClick={() => onRemove(column.interviewer?.memberId ?? '')}
                  aria-label={`Remove ${column.interviewer.name}`}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar pb-6">
        {count > 0 ? (
          column.candidates.map((candidate) => (
            <AllocationCard
              key={candidate.applicationId}
              candidate={candidate}
              stage={stage}
              jobPostingId={jobPostingId}
              onOpenCandidate={onOpenCandidate}
              onStartInterview={onStartInterview}
              onCompleteInterview={onCompleteInterview}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4 text-center text-xs text-neutral-500">
            {isUnassigned ? 'All candidates assigned' : 'Drop candidates here'}
          </div>
        )}
      </div>
    </section>
  );
}

function InterviewerSelect({
  orgSlug,
  memberId,
  value,
  placeholder,
  onSelect,
  excludedMemberIds,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly value: StageWorkspaceInterviewer | null;
  readonly placeholder?: string;
  readonly onSelect: (interviewer: StageWorkspaceInterviewer) => void;
  readonly excludedMemberIds?: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const interviewersQuery = useInterviewersSearch(orgSlug, memberId, search);
  const allInterviewers = interviewersQuery.data?.items ?? [];
  const interviewers = excludedMemberIds
    ? allInterviewers.filter((iv) => !excludedMemberIds.has(iv.memberId))
    : allInterviewers;

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
  jobSlug = null,
}: StageWorkspacePageShellProps) {
  const stageWorkspaceQuery = useStageWorkspace(orgSlug, memberId, stageSlug);
  const jobStageWorkspaceQuery = useStageWorkspaceByJobSlug(orgSlug, memberId, jobSlug, stageSlug);
  const workspaceQuery = jobSlug ? jobStageWorkspaceQuery : stageWorkspaceQuery;
  const previewWarnings = usePreviewStageInterviewWarnings(orgSlug, memberId, stageSlug, workspaceQuery.data?.jobPosting.id ?? null);
  const assignInterviews = useAssignStageInterviews(orgSlug, memberId, stageSlug, workspaceQuery.data?.jobPosting.id ?? null);
  const distributeInterviews = useDistributeStageInterviews(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const hiringTeamsQuery = useFetchHiringTeams(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null, workspaceQuery.data?.stage.id ?? null);
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
  const [boardAssignments, setBoardAssignments] = useState<Record<string, string | null>>({});
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);

  // Search + filter state for automatic tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<'interviewer' | 'backup'>('interviewer');
  const [assignmentTeamId, setAssignmentTeamId] = useState<string | null>(null);
  const [backupTeamId, setBackupTeamId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const addTeamMember = useAddHiringTeamMember(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const removeTeamMember = useRemoveHiringTeamMember(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const startInterviewMeeting = useStartInterviewMeeting(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const completeInterviewMeeting = useCompleteInterviewMeeting(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const moveInterview = useMoveInterviewAssignment(orgSlug, memberId);
  const completeStage = useCompleteStage(orgSlug, memberId);
  const reopenStage = useReopenStage(orgSlug, memberId);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    () => workspace?.candidates
      .filter((candidate) => !isLockedAssignment(candidate))
      .map((candidate) => candidate.applicationId) ?? [],
    [workspace],
  );

  // On workspace load, populate customTeamMembers / backupMembers from existing workspace teams.
  // Track which stage we've initialized for so we reset on stage change.
  const initializedStageRef = useRef<string | null>(null);

  // Reset team-local state whenever the stageId changes
  const prevStageIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentStageId = workspace?.stage.id ?? null;
    if (currentStageId !== prevStageIdRef.current) {
      prevStageIdRef.current = currentStageId;
      initializedStageRef.current = null;
      setAssignmentTeamId('');
      setBackupTeamId(null);
      setCustomTeamMembers([]);
      setBackupMembers([]);
      setSelectedTeamId('');
    }
  }, [workspace?.stage.id]);

  useEffect(() => {
    const stageId = workspace?.stage.id;
    if (!stageId) return;
    if (initializedStageRef.current === stageId) return;

    const primaryTeam = hiringTeams.find(
      (team) => team.name === `Workspace-Primary-${stageId}`,
    );
    const backupTeam = hiringTeams.find(
      (team) => team.name === `Workspace-Backup-${stageId}`,
    );

    if (primaryTeam || backupTeam) {
      initializedStageRef.current = stageId;
    }

    const timeoutId = window.setTimeout(() => {
      if (primaryTeam) {
        setAssignmentTeamId(primaryTeam.id);
        setCustomTeamMembers(teamMemberToInterviewer(primaryTeam));
      }
      if (backupTeam) {
        setBackupTeamId(backupTeam.id);
        setBackupMembers(teamMemberToInterviewer(backupTeam));
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [hiringTeams, workspace?.stage.id]);

  const resolvedTeamMembers = useMemo(() => {
    if (selectedTeam) return teamMemberToInterviewer(selectedTeam);
    return customTeamMembers;
  }, [customTeamMembers, selectedTeam]);

  const activeCandidate = useMemo(
    () => workspace?.candidates.find((candidate) => candidate.applicationId === activeApplicationId) ?? null,
    [activeApplicationId, workspace],
  );

  /** Whether this candidate passes the current filterMode (all / unassigned / assigned) */
  function matchesFilterMode(candidate: StageWorkspaceCandidate): boolean {
    const isAssigned =
      boardAssignments[candidate.applicationId] !== undefined ||
      candidate.currentAssignment?.interviewer !== null;
    if (filterMode === 'unassigned' && isAssigned) return false;
    if (filterMode === 'assigned' && !isAssigned) return false;
    return true;
  }

  /** Whether a candidate's name or email includes the active search query */
  function candidateMatchesQuery(candidate: StageWorkspaceCandidate): boolean {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = candidateName(candidate).toLowerCase();
    const email = candidate.candidate.email.toLowerCase();
    return name.includes(q) || email.includes(q);
  }

  const assignmentColumns = useMemo<AssignmentColumnModel[]>(() => {
    if (!workspace) return [];

    // Build primary interviewer columns (in order)
    const primaryIds = new Set(resolvedTeamMembers.map((m) => m.memberId));
    const backupIds = new Set(backupMembers.map((m) => m.memberId));

    // Collect any extra interviewers from existing assignments
    const extraInterviewers = new Map<string, StageWorkspaceInterviewer>();
    for (const candidate of workspace.candidates) {
      const memberId = candidate.currentAssignment?.interviewer?.memberId;
      const interviewer = candidate.currentAssignment?.interviewer;
      if (memberId && interviewer && !primaryIds.has(memberId) && !backupIds.has(memberId)) {
        extraInterviewers.set(memberId, interviewer);
      }
    }

    // Column order: Unassigned → Primary interviewers → Extra interviewers → Backups
    const columns: AssignmentColumnModel[] = [
      {
        id: 'unassigned',
        title: 'Unassigned',
        interviewer: null,
        candidates: [],
      },
      ...resolvedTeamMembers.map((interviewer) => ({
        id: allocationColumnId(interviewer.memberId),
        title: interviewer.name,
        interviewer,
        candidates: [],
      })),
      ...Array.from(extraInterviewers.values()).map((interviewer) => ({
        id: allocationColumnId(interviewer.memberId),
        title: interviewer.name,
        interviewer,
        candidates: [],
      })),
      ...backupMembers
        .filter((member) => !primaryIds.has(member.memberId))
        .map((interviewer) => ({
          id: allocationColumnId(interviewer.memberId),
          title: interviewer.name,
          interviewer,
          isBackup: true,
          candidates: [],
        })),
    ];
    const columnsById = new Map(columns.map((column) => [column.id, column]));

    // Place candidates filtered by filterMode only (search is handled below)
    for (const candidate of workspace.candidates) {
      if (!matchesFilterMode(candidate)) continue;

      const memberId = boardAssignments[candidate.applicationId]
        ?? candidate.currentAssignment?.interviewer?.memberId
        ?? null;
      const columnId = memberId ? allocationColumnId(memberId) : 'unassigned';
      const column = columnsById.get(columnId) ?? columnsById.get('unassigned');
      column?.candidates.push(candidate);
    }

    // Apply search-based column visibility and candidate sorting
    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      // Within each column, sort matching candidates to the top
      for (const column of columns) {
        const matched: StageWorkspaceCandidate[] = [];
        const unmatched: StageWorkspaceCandidate[] = [];
        for (const candidate of column.candidates) {
          const name = candidateName(candidate).toLowerCase();
          const email = candidate.candidate.email.toLowerCase();
          if (name.includes(q) || email.includes(q)) {
            matched.push(candidate);
          } else {
            unmatched.push(candidate);
          }
        }
        column.candidates = [...matched, ...unmatched];
      }

      // Keep only columns that have matching candidates OR a matching interviewer
      return columns.filter((column) => {
        if (column.id === 'unassigned') {
          return column.candidates.length > 0 && column.candidates.some(
            (c) => candidateName(c).toLowerCase().includes(q) || c.candidate.email.toLowerCase().includes(q),
          );
        }
        const interviewerMatch = column.interviewer?.name.toLowerCase().includes(q) ?? false;
        const candidateMatch = column.candidates.some(
          (c) => candidateName(c).toLowerCase().includes(q) || c.candidate.email.toLowerCase().includes(q),
        );
        return interviewerMatch || candidateMatch;
      });
    }

    return columns;
  }, [boardAssignments, resolvedTeamMembers, workspace, backupMembers, searchQuery, filterMode]);

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
      if (!assignment.scheduledStartAt) continue;
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

  const stats = useMemo(() => {
    const total = workspace?.candidates.length ?? 0;
    const assignedSet = new Set<string>();
    for (const candidate of workspace?.candidates ?? []) {
      const memberId =
        boardAssignments[candidate.applicationId] ??
        candidate.currentAssignment?.interviewer?.memberId ??
        null;
      if (memberId) assignedSet.add(candidate.applicationId);
    }
    return {
      total,
      assigned: assignedSet.size,
      unassigned: total - assignedSet.size,
      interviewers: resolvedTeamMembers.length,
    };
  }, [boardAssignments, resolvedTeamMembers, workspace]);

  const isStageCompleted = Boolean(workspace?.stage.completedAt);

  const excludedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const member of resolvedTeamMembers) ids.add(member.memberId);
    for (const member of backupMembers) ids.add(member.memberId);
    return ids;
  }, [resolvedTeamMembers, backupMembers]);

  const directExcludedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const member of resolvedTeamMembers) ids.add(member.memberId);
    for (const member of backupMembers) ids.add(member.memberId);
    for (const draft of Object.values(drafts)) {
      if (draft?.interviewer) ids.add(draft.interviewer.memberId);
    }
    return ids;
  }, [resolvedTeamMembers, backupMembers, drafts]);

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

  async function addCustomTeamMember(interviewer: StageWorkspaceInterviewer) {
    setSelectedTeamId('');
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);

    // Persist to server
    const stageId = workspace?.stage.id;
    const jobPostingId = workspace?.jobPosting.id;
    const dept = interviewer.department ?? undefined;
    try {
      if (!assignmentTeamId && jobPostingId && stageId) {
        const created = await createHiringTeam.mutateAsync({
          jobPostingId,
          name: `Workspace-Primary-${stageId}`,
          description: null,
          stageId,
          members: [{ memberId: interviewer.memberId, role: dept }],
        });
        setAssignmentTeamId(created.id);
      } else if (assignmentTeamId) {
        await addTeamMember.mutateAsync({
          teamId: assignmentTeamId,
          data: { memberId: interviewer.memberId, role: dept },
        });
      }
    } catch {
      toast.error('Failed to add interviewer. Please try again.');
      return;
    }

    setCustomTeamMembers((current) => (
      current.some((member) => member.memberId === interviewer.memberId)
        ? current
        : [...current, interviewer]
    ));
  }

  async function addBackupMember(interviewer: StageWorkspaceInterviewer) {
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);

    // Persist to server
    const stageId = workspace?.stage.id;
    const jobPostingId = workspace?.jobPosting.id;
    try {
      if (!backupTeamId && jobPostingId && stageId) {
        const created = await createHiringTeam.mutateAsync({
          jobPostingId,
          name: `Workspace-Backup-${stageId}`,
          description: null,
          stageId,
          members: [{ memberId: interviewer.memberId }],
        });
        setBackupTeamId(created.id);
      } else if (backupTeamId) {
        await addTeamMember.mutateAsync({
          teamId: backupTeamId,
          data: { memberId: interviewer.memberId },
        });
      }
    } catch {
      toast.error('Failed to add backup. Please try again.');
      return;
    }

    setBackupMembers((current) => (
      current.some((member) => member.memberId === interviewer.memberId)
        ? current
        : [...current, interviewer]
    ));
  }

  async function removeBackupMember(memberId: string) {
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);

    // Remove from server
    if (backupTeamId) {
      try {
        await removeTeamMember.mutateAsync({ teamId: backupTeamId, memberToRemoveId: memberId });
      } catch {
        toast.error('Failed to remove backup. Please try again.');
        return;
      }
    }

    setBackupMembers((current) => current.filter((member) => member.memberId !== memberId));
  }

  async function removeBoardInterviewer(memberId: string) {
    if (!memberId) return;
    setSelectedTeamId('');

    // Remove from server — try both teams
    if (assignmentTeamId) {
      try {
        await removeTeamMember.mutateAsync({ teamId: assignmentTeamId, memberToRemoveId: memberId });
      } catch {
        toast.error('Failed to remove interviewer. Please try again.');
        return;
      }
    }
    if (backupTeamId) {
      try {
        await removeTeamMember.mutateAsync({ teamId: backupTeamId, memberToRemoveId: memberId });
      } catch {
        // Non-critical — backup removal failure is not blocking
      }
    }

    setCustomTeamMembers((current) => current.filter((member) => member.memberId !== memberId));
    setBackupMembers((current) => current.filter((member) => member.memberId !== memberId));
    setBoardAssignments((current) => {
      const next = { ...current };
      for (const [applicationId, assignedMemberId] of Object.entries(next)) {
        if (assignedMemberId === memberId) next[applicationId] = null;
      }
      return next;
    });
  }

  function handleBoardDragStart(event: DragStartEvent) {
    setActiveApplicationId(String(event.active.id));
  }

  function handleBoardDragEnd(event: DragEndEvent) {
    const applicationId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    setActiveApplicationId(null);
    if (!overId) return;
    const candidate = workspace?.candidates.find((item) => item.applicationId === applicationId);
    if (!candidate || isLockedAssignment(candidate)) return;
    setBoardAssignments((current) => ({
      ...current,
      [applicationId]: memberIdFromColumnId(overId),
    }));
  }

  function handleAutoDistributeDraft() {
    if (!workspace || resolvedTeamMembers.length === 0) {
      toast.error('Add at least one interviewer first');
      return;
    }
    setBoardAssignments((current) => {
      const next = { ...current };
      let index = 0;
      for (const candidate of workspace.candidates) {
        if (isLockedAssignment(candidate)) continue;
        const assignedMemberId = next[candidate.applicationId]
          ?? candidate.currentAssignment?.interviewer?.memberId
          ?? null;
        if (assignedMemberId) continue;
        next[candidate.applicationId] = resolvedTeamMembers[index % resolvedTeamMembers.length]?.memberId ?? null;
        index += 1;
      }
      return next;
    });
  }

  async function handleSaveBoardAssignments() {
    if (!workspace) {
      return;
    }

    const newAssignments: StageInterviewAssignment[] = [];
    const moves: Array<{ applicationId: string; eventId: string; newInterviewerMemberId: string }> = [];

    for (const candidate of workspace.candidates) {
      if (isLockedAssignment(candidate)) continue;
      const newMemberId = boardAssignments[candidate.applicationId]
        ?? candidate.currentAssignment?.interviewer?.memberId
        ?? null;
      if (!newMemberId) continue;

      const existingEventId = candidate.currentAssignment?.eventId;
      const existingMemberId = candidate.currentAssignment?.interviewer?.memberId ?? null;

      if (existingEventId && existingMemberId && existingMemberId !== newMemberId) {
        // This is a move — use approval-based endpoint
        moves.push({
          applicationId: candidate.applicationId,
          eventId: existingEventId,
          newInterviewerMemberId: newMemberId,
        });
      } else if (!existingEventId) {
        // New assignment
        newAssignments.push({
          applicationId: candidate.applicationId,
          interviewerMemberId: newMemberId,
          scheduledStartAt: null,
          durationMinutes: teamDurationMinutes,
          backupInterviewers: backupMembers.map((member) => member.memberId),
        });
      }
    }

    if (newAssignments.length === 0 && moves.length === 0) {
      toast.error('Assign at least one candidate to an interviewer');
      return;
    }

    try {
      let totalCount = 0;
      if (newAssignments.length > 0) {
        const result = await assignInterviews.mutateAsync(newAssignments);
        totalCount += result.assignedCount;
      }
      for (const move of moves) {
        await moveInterview.mutateAsync({
          applicationId: move.applicationId,
          eventId: move.eventId,
          data: { newInterviewerMemberId: move.newInterviewerMemberId },
        });
        totalCount += 1;
      }
      toast.success(`${totalCount} assignment${totalCount === 1 ? '' : 's'} saved`);
      setBackupMembers([]);
      setBoardAssignments({});
    } catch (error) {
      toast.error(readActionError(error, 'Failed to save assignments'));
    }
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
          stageId: workspace?.stage.id ?? null,
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

  function handleOpenCandidate(applicationId: string) {
    setSelectedApplicationId(applicationId);
  }

  function handleStartInterview(application: PipelineApplication) {
    const meeting = application.interviewMeeting;
    if (!meeting || meeting.status !== 'PENDING') return;

    startInterviewMeeting.mutate(
      { applicationId: application.id, eventId: meeting.id },
      {
        onSuccess: (updatedMeeting) => {
          void workspaceQuery.refetch();
          if (updatedMeeting.meetingUrl) {
            window.open(updatedMeeting.meetingUrl, '_blank', 'noopener,noreferrer');
          }
        },
        onError: (error) => {
          toast.error(readActionError(error, 'Failed to start interview'));
          if (meeting.meetingUrl) {
            window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer');
          }
        },
      },
    );
  }

  function handleCompleteInterview(
    application: PipelineApplication,
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    },
  ) {
    const meeting = application.interviewMeeting;
    if (!meeting?.id) return;

    completeInterviewMeeting.mutate(
      { applicationId: application.id, eventId: meeting.id, data },
      {
        onSuccess: () => {
          void workspaceQuery.refetch();
          toast.success('Interview marked completed');
        },
        onError: (error) => toast.error(readActionError(error, 'Failed to complete interview')),
      },
    );
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
    <div className="min-h-full bg-canvas px-6 sm:px-8">
      <div className="mb-6">
          <div className="flex items-center justify-between mt-7">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900" onClick={() => router.back()}>
                <ChevronLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
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
            </div>

            <div className="flex items-center gap-2">
              {isStageCompleted ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!workspace) return;
                    try {
                      await reopenStage.mutateAsync({ stageId: workspace.stage.id });
                      toast.success('Stage reopened');
                      void workspaceQuery.refetch();
                    } catch (error) {
                      toast.error(readActionError(error, 'Failed to reopen stage'));
                    }
                  }}
                  disabled={reopenStage.isPending}
                >
                  {reopenStage.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  )}
                  Reopen Stage
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-warning-text border-warning-bg hover:bg-warning-bg"
                  onClick={async () => {
                    if (!workspace) return;
                    try {
                      await completeStage.mutateAsync({ stageId: workspace.stage.id });
                      toast.success('Stage marked as complete');
                      void workspaceQuery.refetch();
                    } catch (error) {
                      toast.error(readActionError(error, 'Failed to complete stage'));
                    }
                  }}
                  disabled={completeStage.isPending}
                >
                  {completeStage.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  )}
                  Mark Complete
                </Button>
              )}
              <div className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
                {([
                  { key: 'direct' as const, icon: UserCheck, label: 'Direct' },
                  { key: 'automatic' as const, icon: Shuffle, label: 'Automatic' },
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.key === assignmentMode;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setAssignmentMode(tab.key)}
                      aria-pressed={isActive}
                      className={cn(
                        'relative inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-[color,transform] duration-150 ease-out',
                        isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="stage-assignment-mode-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 36,
                            mass: 0.65,
                          }}
                        />
                      ) : null}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {isStageCompleted ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-600">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-neutral-500" />
                <div>
                  <p className="font-semibold text-neutral-800">Stage Completed</p>
                  <p className="mt-0.5 text-neutral-500">
                    This stage has been marked as complete. All operations are now read-only.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

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
                  <div className="flex flex-col gap-4 border-b border-neutral-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Direct Assignment</h2>
                    </div>
                    <Button
                      type="button"
                      size="lg"
                      className="bg-primary hover:bg-primary-hover shadow-md transition-all active:scale-[0.98]"
                      onClick={handleAssignDirect}
                      disabled={completedAssignments.length === 0 || assignInterviews.isPending || isStageCompleted}
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
                          const fallbackSchedule = candidate.currentAssignment?.scheduledStartAt
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
                                    {candidate.currentAssignment?.scheduledStartAt ? (
                                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                                        <Clock className="size-3" />
                                        <span>Scheduled: {formatDateTime(candidate.currentAssignment.scheduledStartAt)}</span>
                                      </div>
                                    ) : candidate.currentAssignment ? (
                                      <p className="mt-1 text-[11px] font-medium text-warning-text">Awaiting interviewer response</p>
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
                                  excludedMemberIds={directExcludedMemberIds}
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
              <div className="flex flex-col gap-4">
                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total candidates', value: stats.total },
                    { label: 'Assigned', value: stats.assigned },
                    { label: 'Unassigned', value: stats.unassigned },
                    { label: 'Interviewers', value: stats.interviewers },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3"
                    >
                      <div className="text-2xl font-semibold tracking-tight text-neutral-900">
                        {stat.value}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Search + Filter pills */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Filter candidates..."
                      className="h-9 bg-white pl-9 text-[13px]"
                    />
                  </div>
                  <div className="flex items-center self-stretch rounded-xl border border-black/4 bg-neutral-50 p-1">
                    {([
                      { key: 'all' as const, label: 'All' },
                      { key: 'unassigned' as const, label: 'Unassigned' },
                      { key: 'assigned' as const, label: 'Assigned' },
                    ]).map((pill) => {
                      const isActive = pill.key === filterMode;
                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setFilterMode(pill.key)}
                          aria-pressed={isActive}
                          className={cn(
                            'relative inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-medium transition-[color,transform] duration-150 ease-out',
                            isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
                          )}
                        >
                          {isActive ? (
                            <motion.span
                              layoutId="candidate-filter-mode-pill"
                              className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                              transition={{
                                type: 'spring',
                                stiffness: 520,
                                damping: 36,
                                mass: 0.65,
                              }}
                            />
                          ) : null}
                          <span className="relative z-10">{pill.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddDialogMode('interviewer');
                        setAddDialogOpen(true);
                      }}
                      disabled={isStageCompleted}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add Interviewer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddDialogMode('backup');
                        setAddDialogOpen(true);
                      }}
                      disabled={isStageCompleted}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add Backup
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDistributeDraft}
                      disabled={resolvedTeamMembers.length === 0 || isStageCompleted}
                    >
                      <Shuffle className="mr-1.5 size-3.5" />
                      Auto-distribute
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary hover:bg-primary-hover"
                      onClick={handleSaveBoardAssignments}
                      disabled={assignInterviews.isPending || isStageCompleted}
                    >
                      {assignInterviews.isPending ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 size-3.5" />
                      )}
                      Save Assignments
                    </Button>
                  </div>
                </div>

                {/* Board */}
                {!isStageCompleted ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleBoardDragStart}
                    onDragEnd={handleBoardDragEnd}
                    onDragCancel={() => setActiveApplicationId(null)}
                  >
                  <div className="flex flex-1 min-h-0 items-stretch gap-0 overflow-x-auto overflow-y-hidden no-scrollbar"
                    style={{ maxHeight: 'calc(100dvh - 280px)' }}
                  >
                    {assignmentColumns.map((column, index) => (
                      <div key={column.id} className={cn(
                        'flex shrink-0',
                        index < assignmentColumns.length - 1 ? 'border-r border-neutral-200/70' : '',
                      )}>
                        <AssignmentColumn
                          column={column}
                          stage={workspace.stage}
                          jobPostingId={workspace.jobPosting.id}
                          onRemove={column.interviewer ? removeBoardInterviewer : undefined}
                          onOpenCandidate={handleOpenCandidate}
                          onStartInterview={handleStartInterview}
                          onCompleteInterview={handleCompleteInterview}
                        />
                      </div>
                    ))}
                  </div>
                  <DragOverlay zIndex={9999}>
                    {activeCandidate ? (
                      <AllocationCard
                        candidate={activeCandidate}
                        stage={workspace.stage}
                        jobPostingId={workspace.jobPosting.id}
                        disabled
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
                ) : (
                  <div className="flex flex-1 min-h-0 items-stretch gap-0 overflow-x-auto overflow-y-hidden no-scrollbar"
                    style={{ maxHeight: 'calc(100dvh - 280px)' }}
                  >
                    {assignmentColumns.map((column, index) => (
                      <div key={column.id} className={cn(
                        'flex shrink-0',
                        index < assignmentColumns.length - 1 ? 'border-r border-neutral-200/70' : '',
                      )}>
                        <AssignmentColumn
                          column={column}
                          stage={workspace.stage}
                          jobPostingId={workspace.jobPosting.id}
                          onOpenCandidate={handleOpenCandidate}
                          onStartInterview={handleStartInterview}
                          onCompleteInterview={handleCompleteInterview}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Dialogs */}
                <InterviewerSelectDialog
                  open={addDialogOpen && addDialogMode === 'interviewer'}
                  onOpenChange={(open) => setAddDialogOpen(open)}
                  orgSlug={orgSlug}
                  memberId={memberId}
                  mode="interviewer"
                  onSelect={addCustomTeamMember}
                  excludedMemberIds={excludedMemberIds}
                />
                <InterviewerSelectDialog
                  open={addDialogOpen && addDialogMode === 'backup'}
                  onOpenChange={(open) => setAddDialogOpen(open)}
                  orgSlug={orgSlug}
                  memberId={memberId}
                  mode="backup"
                  onSelect={addBackupMember}
                  excludedMemberIds={excludedMemberIds}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        <CandidateDrawer
          orgSlug={orgSlug}
          memberId={memberId}
          applicationId={selectedApplicationId}
          open={selectedApplicationId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedApplicationId(null);
          }}
        />
    </div>
  );
}
