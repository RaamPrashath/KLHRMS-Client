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
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronLeft, Inbox, Loader2, Plus, Search, Send, Shuffle, X } from 'lucide-react';
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
import { CompleteInterviewDialog } from '@/modules/candidates/components/CompleteInterviewDialog';
import { InterviewerSelectDialog } from '@/modules/candidates/components/InterviewerSelectDialog';
import { StageWorkspaceSkeleton } from '@/modules/candidates/components/StageWorkspaceSkeleton';
import {
  useAddHiringTeamMember,
  useAssignStageInterviews,
  useCompleteInterviewMeeting,
  useCompleteStage,
  useCreateHiringTeam,
  useDistributeStageInterviews,
  useInterviewersSearch,
  useMoveInterviewAssignment,
  useReopenStage,
  useRemoveHiringTeamMember,
  useStartInterviewMeeting,
  useStageWorkspace,
  useStageWorkspaceByJobSlug,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  ApplicationInterviewMeeting,
  PipelineApplication,
  PipelineStage,
  StageInterviewAssignment,
  StageWorkspace,
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
  readonly initialWorkspace?: StageWorkspace;
}

interface AssignmentColumnModel {
  id: string;
  title: string;
  interviewer: StageWorkspaceInterviewer | null;
  candidates: StageWorkspaceCandidate[];
}

function initials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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

function isLockedAssignment(candidate: StageWorkspaceCandidate): boolean {
  const status = candidate.currentAssignment?.status;
  return status === 'ACCEPTED' || status === 'SCHEDULED' || status === 'ONGOING' || status === 'COMPLETED';
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
    source: candidate.source,
    appliedDate: candidate.appliedAt,
    lastMovedAt: null,
    status: candidate.currentAssignment?.status ?? 'UNASSIGNED',
    currentAssignment: candidate.currentAssignment ?? null,
    resumeUrl: candidate.candidate.resumeUrl,
    aiScore: null,
    aiAnalysisStatus: null,
    aiEvaluationStatus: null,
    isFlaggedForCheating: false,
    aiFailedKnockouts: [],
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
      meetingEnabled={Boolean(stage.meetingEnabled)}
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
                    backgroundColor: '#EEEDFE',
                    color: '#534AB7',
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
  initialWorkspace,
}: StageWorkspacePageShellProps) {
  const stageWorkspaceQuery = useStageWorkspace(orgSlug, memberId, jobSlug ? '' : stageSlug);
  const jobStageWorkspaceQuery = useStageWorkspaceByJobSlug(orgSlug, memberId, jobSlug, stageSlug, initialWorkspace);
  const workspaceQuery = jobSlug ? jobStageWorkspaceQuery : stageWorkspaceQuery;
  const assignInterviews = useAssignStageInterviews(orgSlug, memberId, stageSlug, workspaceQuery.data?.jobPosting.id ?? null);
  const distributeInterviews = useDistributeStageInterviews(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const createHiringTeam = useCreateHiringTeam(orgSlug, memberId, workspaceQuery.data?.jobPosting.id ?? null);
  const [teamScheduledLocal, setTeamScheduledLocal] = useState('');
  const [teamDurationMinutes, setTeamDurationMinutes] = useState(30);
  const [teamWarnings, setTeamWarnings] = useState<StageInterviewWarning[]>([]);
  const [teamWarningsReviewed, setTeamWarningsReviewed] = useState(false);
  const [boardAssignments, setBoardAssignments] = useState<Record<string, string | null>>({});
  const [optimisticTeamMembers, setOptimisticTeamMembers] = useState<StageWorkspaceInterviewer[]>([]);
  const [optimisticRemovedMemberIds, setOptimisticRemovedMemberIds] = useState<Set<string>>(() => new Set());
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);

  // Search + filter state for automatic tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [localAssignmentTeamId, setLocalAssignmentTeamId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [completingApplication, setCompletingApplication] = useState<PipelineApplication | null>(null);
  const [completionNote, setCompletionNote] = useState('');

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
  const assignmentTeamId = localAssignmentTeamId ?? workspace?.assignmentTeamId ?? null;
  const selectedApplicationIds = useMemo(
    () => workspace?.candidates
      .filter((candidate) => !isLockedAssignment(candidate))
      .map((candidate) => candidate.applicationId) ?? [],
    [workspace],
  );

  const teamMembers = useMemo(
    () => {
      const membersById = new Map<string, StageWorkspaceInterviewer>();
      for (const member of workspace?.teamMembers ?? []) {
        if (!optimisticRemovedMemberIds.has(member.memberId)) {
          membersById.set(member.memberId, member);
        }
      }
      for (const member of optimisticTeamMembers) {
        if (!optimisticRemovedMemberIds.has(member.memberId)) {
          membersById.set(member.memberId, member);
        }
      }
      return Array.from(membersById.values());
    },
    [optimisticRemovedMemberIds, optimisticTeamMembers, workspace?.teamMembers],
  );

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
    const primaryIds = new Set(teamMembers.map((m) => m.memberId));

    // Collect any extra interviewers from existing assignments
    const extraInterviewers = new Map<string, StageWorkspaceInterviewer>();
    for (const candidate of workspace.candidates) {
      const memberId = candidate.currentAssignment?.interviewer?.memberId;
      const interviewer = candidate.currentAssignment?.interviewer;
      if (memberId && interviewer && !primaryIds.has(memberId)) {
        extraInterviewers.set(memberId, interviewer);
      }
    }

    // Column order: Unassigned → Primary interviewers → Extra interviewers
    const columns: AssignmentColumnModel[] = [
      {
        id: 'unassigned',
        title: 'Unassigned',
        interviewer: null,
        candidates: [],
      },
      ...teamMembers.map((interviewer) => ({
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
  }, [boardAssignments, teamMembers, workspace, searchQuery, filterMode]);

  const warningMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const warning of teamWarnings) {
      map.set(warning.applicationId, warning.messages);
    }
    return map;
  }, [teamWarnings]);

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
      interviewers: teamMembers.length,
    };
  }, [boardAssignments, teamMembers, workspace]);

  const isStageCompleted = Boolean(workspace?.stage.completedAt);
  const isJobClosed = workspace?.jobPosting.status === 'CLOSED';
  const isWorkspaceReadOnly = isStageCompleted || isJobClosed;

  function handleBackToPipeline() {
    if (!jobSlug) {
      router.back();
      return;
    }

    const storageKey = `ats-stage-return:${orgSlug}:${jobSlug}:${stageSlug}`;
    const storedReturnPath = window.sessionStorage.getItem(storageKey);
    const jobBasePath = `/${orgSlug}/candidates/${jobSlug}`;
    const isPipelinePath =
      storedReturnPath === jobBasePath ||
      storedReturnPath === `${jobBasePath}/kanban` ||
      storedReturnPath === `${jobBasePath}/table`;

    router.push(isPipelinePath ? storedReturnPath : `${jobBasePath}/kanban`);
  }

  const excludedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const member of teamMembers) ids.add(member.memberId);
    return ids;
  }, [teamMembers]);

  async function addCustomTeamMember(interviewer: StageWorkspaceInterviewer) {
    if (isWorkspaceReadOnly) return;
    setTeamWarnings([]);
    setTeamWarningsReviewed(false);
    setAddDialogOpen(false);
    setOptimisticRemovedMemberIds((current) => {
      const next = new Set(current);
      next.delete(interviewer.memberId);
      return next;
    });
    setOptimisticTeamMembers((current) => {
      if (current.some((member) => member.memberId === interviewer.memberId)) return current;
      return [...current, interviewer];
    });

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
        setLocalAssignmentTeamId(created.id);
      } else if (assignmentTeamId) {
        await addTeamMember.mutateAsync({
          teamId: assignmentTeamId,
          data: { memberId: interviewer.memberId, role: dept },
        });
      }
    } catch {
      setOptimisticTeamMembers((current) => current.filter((member) => member.memberId !== interviewer.memberId));
      toast.error('Failed to add interviewer. Please try again.');
      return;
    }

    void workspaceQuery.refetch();
  }

  async function removeBoardInterviewer(memberId: string) {
    if (isWorkspaceReadOnly) return;
    if (!memberId) return;
    setOptimisticTeamMembers((current) => current.filter((member) => member.memberId !== memberId));
    setOptimisticRemovedMemberIds((current) => {
      const next = new Set(current);
      next.add(memberId);
      return next;
    });

    // Remove from server
    if (assignmentTeamId) {
      try {
        await removeTeamMember.mutateAsync({ teamId: assignmentTeamId, memberToRemoveId: memberId });
      } catch {
        setOptimisticRemovedMemberIds((current) => {
          const next = new Set(current);
          next.delete(memberId);
          return next;
        });
        toast.error('Failed to remove interviewer. Please try again.');
        return;
      }
    }

    // Remove from local state
    setBoardAssignments((current) => {
      const next = { ...current };
      for (const [applicationId, assignedMemberId] of Object.entries(next)) {
        if (assignedMemberId === memberId) next[applicationId] = null;
      }
      return next;
    });

    void workspaceQuery.refetch();
  }

  function handleBoardDragStart(event: DragStartEvent) {
    if (isWorkspaceReadOnly) return;
    setActiveApplicationId(String(event.active.id));
  }

  function handleBoardDragEnd(event: DragEndEvent) {
    if (isWorkspaceReadOnly) {
      setActiveApplicationId(null);
      return;
    }
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
    if (isWorkspaceReadOnly) return;
    if (!workspace || teamMembers.length === 0) {
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
        next[candidate.applicationId] = teamMembers[index % teamMembers.length]?.memberId ?? null;
        index += 1;
      }
      return next;
    });
  }

  async function handleSaveBoardAssignments() {
    if (isWorkspaceReadOnly) return;
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
        });
      }
    }

    if (newAssignments.length === 0 && moves.length === 0) {
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
      await workspaceQuery.refetch();
      setBoardAssignments({});
    } catch (error) {
      toast.error(readActionError(error, 'Failed to save assignments'));
    }
  }

  async function handleDistributeTeam() {
    if (isWorkspaceReadOnly) return;
    if (teamMembers.length === 0 || !teamScheduledLocal) {
      toast.error('Select a date first, then choose interviewers for the shuffle');
      return;
    }

    try {
      let hiringTeamId = assignmentTeamId ?? '';

      if (!hiringTeamId) {
        const created = await createHiringTeam.mutateAsync({
          jobPostingId: workspace?.jobPosting.id ?? '',
          name: `${workspace?.stage.name ?? 'Interview'} shuffle team`,
          description: null,
          stageId: workspace?.stage.id ?? null,
          members: teamMembers.map((member) => ({ memberId: member.memberId })),
        });
        hiringTeamId = created.id;
        setLocalAssignmentTeamId(created.id);
      }

      const payload: TeamDistributionRequest = {
        hiringTeamId,
        strategy: 'ROUND_ROBIN',
        applicationIds: selectedApplicationIds,
        scheduledStartAt: toIsoFromLocal(teamScheduledLocal),
        durationMinutes: teamDurationMinutes,
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
      setTeamScheduledLocal('');
      setTeamDurationMinutes(30);
      setTeamWarnings([]);
      setTeamWarningsReviewed(false);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to distribute interviews'));
    }
  }

  function handleOpenCandidate(applicationId: string) {
    if (jobSlug) {
      window.sessionStorage.setItem(
        `ats-candidate-return:${orgSlug}:${jobSlug}:${applicationId}`,
        `${window.location.pathname}${window.location.search}`,
      );
      router.push(`/${orgSlug}/candidates/${jobSlug}/${applicationId}`);
      return;
    }

    setSelectedApplicationId(applicationId);
  }

  function handleStartInterview(application: PipelineApplication) {
    if (isWorkspaceReadOnly) return;
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

  function openCompleteInterviewDialog(application: PipelineApplication) {
    if (isWorkspaceReadOnly) return;
    setCompletingApplication(application);
    setCompletionNote('');
  }

  function handleCompleteInterview() {
    if (isWorkspaceReadOnly) return;
    const application = completingApplication;
    if (!application) return;
    const meeting = application.interviewMeeting;
    if (!meeting?.id) return;
    const note = completionNote.trim();

    completeInterviewMeeting.mutate(
      {
        applicationId: application.id,
        eventId: meeting.id,
        data: { notes: note },
      },
      {
        onSuccess: () => {
          setCompletingApplication(null);
          setCompletionNote('');
          void workspaceQuery.refetch();
          toast.success('Interview marked completed');
        },
        onError: (error) => toast.error(readActionError(error, 'Failed to complete interview')),
      },
    );
  }

  if (workspaceQuery.isLoading) {
    return <StageWorkspaceSkeleton variant="interview" />;
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas px-6 sm:px-8">
      <div className="mb-6 shrink-0">
          <div className="flex items-center justify-between mt-7">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900" onClick={handleBackToPipeline}>
                <ChevronLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
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
              {isWorkspaceReadOnly ? (
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
                  disabled={reopenStage.isPending || isJobClosed}
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
                  className="text-warning-text border-warning-bg hover:bg-warning-bg bg-white"
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

            </div>
          </div>
        </div>

        {isWorkspaceReadOnly ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 shrink-0 overflow-hidden"
          >
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-600">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-neutral-500" />
                <div>
                  <p className="font-semibold text-neutral-800">{isJobClosed ? 'Job Closed' : 'Stage Completed'}</p>
                  <p className="mt-0.5 text-neutral-500">
                    {isJobClosed
                      ? 'This job opening is closed. This stage is visible, but all operations are read-only.'
                      : 'This stage has been marked as complete. All operations are now read-only.'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* Stats bar */}
          <div className="grid shrink-0 grid-cols-4 gap-3">
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
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter Candidates"
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
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                disabled={isWorkspaceReadOnly}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add Interviewer
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDistributeDraft}
                disabled={teamMembers.length === 0 || isWorkspaceReadOnly}
              >
                <Shuffle className="mr-1.5 size-3.5" />
                Auto-distribute
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary hover:bg-primary-hover"
                onClick={handleSaveBoardAssignments}
                disabled={assignInterviews.isPending || isWorkspaceReadOnly}
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
          {!isWorkspaceReadOnly ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleBoardDragStart}
              onDragEnd={handleBoardDragEnd}
              onDragCancel={() => setActiveApplicationId(null)}
            >
            <div className="flex min-h-0 flex-1 items-stretch gap-0 overflow-x-auto overflow-y-hidden no-scrollbar">
              {assignmentColumns.map((column, index) => (
                <div key={column.id} className={cn(
                  'flex h-full shrink-0',
                  index < assignmentColumns.length - 1 ? 'border-r border-neutral-200/70' : '',
                )}>
                  <AssignmentColumn
                    column={column}
                    stage={workspace.stage}
                    jobPostingId={workspace.jobPosting.id}
                    onRemove={column.interviewer ? removeBoardInterviewer : undefined}
                    onOpenCandidate={handleOpenCandidate}
                    onStartInterview={handleStartInterview}
                    onCompleteInterview={openCompleteInterviewDialog}
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
            <div className="flex min-h-0 flex-1 items-stretch gap-0 overflow-x-auto overflow-y-hidden no-scrollbar">
              {assignmentColumns.map((column, index) => (
                <div key={column.id} className={cn(
                  'flex h-full shrink-0',
                  index < assignmentColumns.length - 1 ? 'border-r border-neutral-200/70' : '',
                )}>
                  <AssignmentColumn
                    column={column}
                    stage={workspace.stage}
                    jobPostingId={workspace.jobPosting.id}
                    onOpenCandidate={handleOpenCandidate}
                    onStartInterview={handleStartInterview}
                    onCompleteInterview={openCompleteInterviewDialog}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Dialogs */}
          <InterviewerSelectDialog
            open={addDialogOpen}
            onOpenChange={(open) => setAddDialogOpen(open)}
            orgSlug={orgSlug}
            memberId={memberId}
            onSelect={addCustomTeamMember}
            excludedMemberIds={excludedMemberIds}
          />
        </div>
        <CompleteInterviewDialog
          open={completingApplication !== null}
          candidateName={
            completingApplication
              ? `${completingApplication.candidate.firstName} ${completingApplication.candidate.lastName}`.trim()
              : null
          }
          detail={completingApplication?.currentStage ?? null}
          note={completionNote}
          isSubmitting={completeInterviewMeeting.isPending}
          onNoteChange={setCompletionNote}
          onOpenChange={(open) => {
            if (!open) {
              setCompletingApplication(null);
              setCompletionNote('');
            }
          }}
          onSubmit={handleCompleteInterview}
        />
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
