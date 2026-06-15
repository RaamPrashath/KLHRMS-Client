'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { CalendarPlus, KanbanSquare, List, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getScope } from '@/lib/hrms-roles';
import { useCandidatesJobContext } from '@/modules/candidates/components/CandidatesJobContext';
import { SchedulingModal } from '@/modules/candidates/components/SchedulingModal';
import { StageTransitionFeedbackDialog } from '@/modules/candidates/components/StageTransitionFeedbackDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CandidateCard } from '@/modules/candidates/components/CandidateCard';
import { CandidateSlotReviewDialog } from '@/modules/candidates/components/CandidateSlotReviewDialog';
import { CompleteInterviewDialog } from '@/modules/candidates/components/CompleteInterviewDialog';
import { AtsPipelineTable } from '@/modules/candidates/components/AtsPipelineTable';
import { KanbanColumn } from '@/modules/candidates/components/KanbanColumn';
import { RejectInterviewDialog } from '@/modules/candidates/components/RejectInterviewDialog';
import { StageConfigDrawer } from '@/modules/candidates/components/StageConfigDrawer';
import { PipelineSetupCard } from '@/modules/jobs/components/PipelineSetupCard';
import { PipelineSetupDialog } from '@/modules/jobs/components/PipelineSetupDialog';
import { authClient } from '@/lib/auth-client';
import {
  useAcceptInterview,
  useBookCandidateProposedSlot,
  useCreatePipelineStage,
  useCompleteInterviewMeeting,
  useRejectInterview,
  useStartInterviewMeeting,
  useDeletePipelineStage,
  useMoveApplicationStage,
  usePipelineBoard,
  useUpdatePipelineStage,
} from '@/modules/candidates/hooks/useAtsPipeline';
import {
  useCreateDefaultPipeline as useCreateRequisitionDefaultPipeline,
  useImportPipeline as useImportRequisitionPipeline,
} from '@/modules/jobs/hooks/usePipelineMutations';
import type {
  AcceptInterviewInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type { MyInterview, PipelineApplication, PipelineStage, RejectInterviewRequest } from '@/modules/candidates/types/atsTypes';
import type { CreatePipelineStageInput as SetupCreatePipelineStageInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type { RolePermissions } from '@/modules/roles/types/role';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_CONNECT_RETURN_PARAM = 'atsGoogleConnected';
const DRAG_EDGE_SCROLL_THRESHOLD = 40;
const DRAG_EDGE_SCROLL_SPEED = 18;
const EMPTY_STAGES: PipelineStage[] = [];

type PendingGoogleAction =
  | { kind: 'create-stage'; data: CreatePipelineStageInput }
  | { kind: 'update-stage'; stageId: string; data: UpdatePipelineStageInput }
  | { kind: 'accept-interview'; applicationId: string; eventId: string };

type AiCandidateFilter = 'all' | 'recommended' | 'flagged' | 'failed';

function matchesApplicationSearch(application: PipelineApplication, stageName: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const candidate = application.candidate;
  const haystack = [
    candidate.firstName,
    candidate.lastName,
    candidate.email,
    candidate.phone,
    application.source,
    application.currentStage,
    stageName,
    application.aiScore?.toString(),
    application.aiAnalysisStatus,
    application.isFlaggedForCheating ? 'flagged suspicious hidden text' : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}

function matchesAiFilter(application: PipelineApplication, filter: AiCandidateFilter): boolean {
  if (filter === 'recommended') return (application.aiScore ?? 0) >= 70 && application.aiEvaluationStatus === 'QUALIFIED';
  if (filter === 'flagged') return application.isFlaggedForCheating;
  if (filter === 'failed') return application.aiAnalysisStatus === 'FAILED';
  return true;
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

function buildStageUpdateInput(data: CreatePipelineStageInput): UpdatePipelineStageInput {
  return {
    name: data.name,
    stageType: data.stageType,
    dueDate: data.dueDate,
    dueDateEnabled: Boolean(data.dueDate),
  };
}

function actionNeedsGoogle(action: PendingGoogleAction): boolean {
  return action.kind === 'accept-interview';
}

function requiredGoogleScope(): string {
  return GOOGLE_CALENDAR_SCOPE;
}

function permissionErrorForAction(action: PendingGoogleAction, permissions?: RolePermissions | null): string | null {
  if (!permissions) return null;
  const required =
    action.kind === 'accept-interview'
      ? { module: 'interviews', action: 'edit', label: 'accept interviews' }
      : { module: 'candidates', action: 'edit', label: 'manage pipeline stages' };

  return permissions[required.module]?.[required.action] === 'organization'
    ? null
    : `You do not have permission to ${required.label}.`;
}

function readAuthAccounts(data: unknown): Array<{ providerId?: unknown; scope?: unknown; scopes?: unknown }> {
  return Array.isArray(data)
    ? data.filter((item): item is { providerId?: unknown; scope?: unknown; scopes?: unknown } => typeof item === 'object' && item !== null)
    : [];
}

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

function schedulingInterviewFromApplication(application: PipelineApplication, eventId: string): MyInterview {
  const assignment = application.currentAssignment;
  return {
    eventId,
    applicationId: application.id,
    stageId: application.pipelineStageId,
    stageName: application.currentStage,
    stageSlug: assignment?.stageSlug ?? null,
    candidate: application.candidate,
    jobTitle: '',
    jobPostingId: application.jobPostingId,
    jobSlug: null,
    scheduledStartAt: assignment?.scheduledStartAt ?? application.interviewMeeting?.scheduledStartAt ?? null,
    scheduledEndAt: assignment?.scheduledEndAt ?? application.interviewMeeting?.scheduledEndAt ?? null,
    status: assignment?.status ?? 'PENDING',
    role: 'INTERVIEWER',
    isBackup: false,
    meetingUrl: assignment?.meetLink ?? application.interviewMeeting?.meetingUrl ?? null,
    stageDueDate: null,
    proposedSlots: assignment?.proposedSlots ?? [],
  };
}

function getStageReorderOrder(
  stages: PipelineStage[],
  stageId: string,
  direction: -1 | 1,
): number | null {
  const orderedStages = [...stages].sort((left, right) => left.order - right.order);
  const currentIndex = orderedStages.findIndex((stage) => stage.id === stageId);
  if (currentIndex === -1) return null;

  if (direction === -1) {
    if (currentIndex === 0) return null;
    const targetIndex = currentIndex - 1;
    const previous = orderedStages[targetIndex - 1];
    const target = orderedStages[targetIndex];
    return previous ? (previous.order + target.order) / 2 : target.order - 1;
  }

  if (currentIndex === orderedStages.length - 1) return null;
  const targetIndex = currentIndex + 1;
  const target = orderedStages[targetIndex];
  const next = orderedStages[targetIndex + 1];
  return next ? (target.order + next.order) / 2 : target.order + 1;
}

function BoardSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-124px)] items-stretch gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((column) => (
        <div key={column} className="flex w-[300px] shrink-0 flex-col rounded-2xl bg-surface-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="border-b border-neutral-100 bg-surface p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-8 rounded-md" />
          </div>
          <div className="flex-1 space-y-3 overflow-hidden p-3">
            {[1, 2, 3].map((card) => (
              <Skeleton key={card} className="h-[116px] shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-neutral-100 p-4">
        <Skeleton className="h-9 w-[180px] rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-9 w-[130px] rounded-md" />
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        <div className="flex gap-4 bg-canvas px-4 py-2.5">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-[200px] rounded-md" />
          <Skeleton className="h-4 w-[120px] rounded-md" />
          <Skeleton className="h-4 w-[100px] rounded-md" />
          <Skeleton className="h-4 w-[100px] rounded-md" />
          <Skeleton className="h-4 w-[60px] rounded-md" />
          <Skeleton className="h-4 w-[80px] rounded-md" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <div className="flex items-center gap-3 min-w-[240px]">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-12 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-neutral-100 p-4">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AtsKanbanBoard({
  orgSlug,
  memberId,
  jobPostingId,
  jobPostings,
  onJobPostingChange,
  isLoadingPostings,
  showJobSelector = true,
  pipelineBasePath,
  defaultView,
  permissions,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobPostingId: string | null;
  readonly jobPostings: Array<{ id: string; slug?: string; title: string; status?: string; requisitionId?: string | null }>;
  readonly onJobPostingChange: (id: string) => void;
  readonly isLoadingPostings: boolean;
  readonly showJobSelector?: boolean;
  readonly pipelineBasePath?: string;
  readonly defaultView?: 'kanban' | 'table';
  readonly permissions?: RolePermissions | null;
}) {
  const router = useRouter();
  const [activeApplication, setActiveApplication] = useState<PipelineApplication | null>(null);
  const [hoverStageId, setHoverStageId] = useState<string | null>(null);
  const [addAfterStageId, setAddAfterStageId] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<PipelineStage | null>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupInitialSelection, setSetupInitialSelection] = useState<'new' | 'default' | 'import'>('new');
  const [importingJobId, setImportingJobId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    if (typeof window === 'undefined') return 'kanban';
    const stored = window.localStorage.getItem('pipeline-view-preference');
    return stored === 'table' ? 'table' : 'kanban';
  });
  const [aiFilter, setAiFilter] = useState<AiCandidateFilter>('all');
  const resolvedViewMode = defaultView ?? viewMode;
  const { searchQuery, addStageSignal, consumeAddStageSignal } = useCandidatesJobContext();
  const deferredGlobalSearch = useDeferredValue(searchQuery);

  const addStageHandledRef = useRef(0);
  const autoOpenedSetupRef = useRef(false);

  const boardQuery = usePipelineBoard(orgSlug, memberId, jobPostingId);

  useEffect(() => {
    const stages = boardQuery.data?.stages ?? [];
    if (addStageSignal > 0 && addStageSignal !== addStageHandledRef.current) {
      addStageHandledRef.current = addStageSignal;
      setAddAfterStageId(stages.at(-1)?.id ?? null);
      consumeAddStageSignal();
    }
  }, [addStageSignal, boardQuery.data?.stages, consumeAddStageSignal]);
  const moveApplication = useMoveApplicationStage(orgSlug, memberId, jobPostingId);
  const createStage = useCreatePipelineStage(orgSlug, memberId, jobPostingId);
  const updateStage = useUpdatePipelineStage(orgSlug, memberId, jobPostingId);
  const deleteStage = useDeletePipelineStage(orgSlug, memberId, jobPostingId);
  const startInterviewMeeting = useStartInterviewMeeting(orgSlug, memberId, jobPostingId);
  const completeInterviewMeeting = useCompleteInterviewMeeting(orgSlug, memberId, jobPostingId);
  const acceptInterview = useAcceptInterview(orgSlug, memberId);
  const rejectInterview = useRejectInterview(orgSlug, memberId);
  const bookCandidateSlot = useBookCandidateProposedSlot(orgSlug, memberId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const pendingStorageKey = useMemo(
    () => `ats-google-pending:${orgSlug}:${jobPostingId ?? 'none'}`,
    [jobPostingId, orgSlug],
  );
  const [pendingGoogleAction, setPendingGoogleAction] = useState<PendingGoogleAction | null>(null);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [schedulingRequest, setSchedulingRequest] = useState<{ application: PipelineApplication; eventId: string } | null>(null);
  const [candidateSlotInterview, setCandidateSlotInterview] = useState<MyInterview | null>(null);
  const [selectedCandidateSlotId, setSelectedCandidateSlotId] = useState<string | null>(null);
  const [rejectRequest, setRejectRequest] = useState<{
    applicationId: string;
    eventId: string;
    candidateName: string;
    jobPostingId: string;
    stageId: string;
  } | null>(null);
  const [completingApplication, setCompletingApplication] = useState<PipelineApplication | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState<{
    applicationId: string;
    fromStageId: string;
    toStageId: string;
    candidateName: string;
    fromStageName: string;
    toStageName: string;
  } | null>(null);
  const [pendingApplicationIds, setPendingApplicationIds] = useState<Set<string>>(new Set());
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragPointerXRef = useRef<number | null>(null);
  const dragEdgeDirectionRef = useRef<-1 | 0 | 1>(0);
  const lockedScrollLeftRef = useRef(0);
  const dragScrollFrameRef = useRef<number | null>(null);
  const currentPosting = useMemo(
    () => jobPostings.find((posting) => posting.id === jobPostingId) ?? null,
    [jobPostingId, jobPostings],
  );
  const isReadOnly = currentPosting?.status === 'CLOSED';
  const allBoardApplications = useMemo(
    () => boardQuery.data?.stages.flatMap((stage) => stage.applications) ?? [],
    [boardQuery.data?.stages],
  );
  const schedulingInterview = useMemo(() => {
    if (!schedulingRequest) return null;
    const interview = schedulingInterviewFromApplication(schedulingRequest.application, schedulingRequest.eventId);
    const stage = boardQuery.data?.stages.find((item) => item.id === schedulingRequest.application.pipelineStageId);
    return { ...interview, jobTitle: currentPosting?.title ?? '', jobSlug: currentPosting?.slug ?? null, stageDueDate: stage?.dueDate ?? null };
  }, [boardQuery.data?.stages, currentPosting?.slug, currentPosting?.title, schedulingRequest]);
  const setupRequisitionId = currentPosting?.requisitionId ?? '';
  const createDefaultPipeline = useCreateRequisitionDefaultPipeline(orgSlug, memberId, setupRequisitionId);
  const importPipeline = useImportRequisitionPipeline(orgSlug, memberId, setupRequisitionId);

  const hasGoogleAccess = useCallback(async (scope: string) => {
    const result = await authClient.listAccounts();
    if (result.error) {
      throw new Error(result.error.message ?? 'Could not check Google connection');
    }

    const accounts = readAuthAccounts(result.data);
    const googleAccount = accounts.find((account) => account.providerId === 'google');

    if (!googleAccount) return false;

    return normalizeGoogleScopes(googleAccount).includes(scope);
  }, []);

  const hasGoogleLinked = useCallback(async () => {
    const result = await authClient.listAccounts();
    if (result.error) return false;

    return readAuthAccounts(result.data).some((account) => account.providerId === 'google');
  }, []);

  const requestGoogleConnection = useCallback((action: PendingGoogleAction) => {
    setPendingGoogleAction(action);
    setGoogleConnectOpen(true);
  }, []);

  const runStageAction = useCallback(
    async (action: PendingGoogleAction, options?: { skipGoogleCheck?: boolean }) => {
      if (isReadOnly) {
        toast.info('This job opening is closed. Pipeline changes are disabled.');
        return;
      }
      const permissionError = permissionErrorForAction(action, permissions);
      if (permissionError) {
        toast.error(permissionError);
        return;
      }

      if (!options?.skipGoogleCheck && actionNeedsGoogle(action)) {
        const hasAccess = await hasGoogleAccess(requiredGoogleScope());
        if (!hasAccess) {
          requestGoogleConnection(action);
          return;
        }
      }

      try {
        if (action.kind === 'create-stage') {
          await createStage.mutateAsync(action.data);
          setAddAfterStageId(null);
          return;
        }

        if (action.kind === 'accept-interview') {
          const application = allBoardApplications.find((item) => item.id === action.applicationId);
          if (!application) {
            toast.error('Candidate could not be found. Refresh the pipeline and try again.');
            return;
          }
          setSchedulingRequest({ application, eventId: action.eventId });
          return;
        }

        await updateStage.mutateAsync({
          stageId: action.stageId,
          data: action.data,
        });
        setRenamingStage(null);
      } catch (error) {
        if (!options?.skipGoogleCheck && isGoogleConnectError(error)) {
          requestGoogleConnection(action);
          return;
        }
        toast.error(readActionError(error, action.kind === 'create-stage' ? 'Failed to create stage' : 'Failed to update stage'));
      }
    },
    [allBoardApplications, createStage, hasGoogleAccess, isReadOnly, permissions, requestGoogleConnection, updateStage],
  );

  useEffect(() => {
    if (!jobPostingId) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(GOOGLE_CONNECT_RETURN_PARAM)) return;

    url.searchParams.delete(GOOGLE_CONNECT_RETURN_PARAM);
    window.history.replaceState(null, '', url.toString());

    const storedAction = window.sessionStorage.getItem(pendingStorageKey);
    if (!storedAction) return;

    window.sessionStorage.removeItem(pendingStorageKey);

    try {
      const action = JSON.parse(storedAction) as PendingGoogleAction;
      window.setTimeout(() => {
        void runStageAction(action);
      }, 0);
    } catch {
      toast.error('Google connected, but the pending stage change could not be restored');
    }
  }, [jobPostingId, pendingStorageKey, runStageAction]);

  useEffect(() => {
    window.localStorage.setItem('pipeline-view-preference', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!activeApplication) return;

    const updateEdgeDirection = () => {
      const container = boardScrollRef.current;
      const pointerX = dragPointerXRef.current;
      if (!container || pointerX === null) {
        dragEdgeDirectionRef.current = 0;
        return;
      }

      const rect = container.getBoundingClientRect();
      if (pointerX <= rect.left + DRAG_EDGE_SCROLL_THRESHOLD) {
        dragEdgeDirectionRef.current = -1;
      } else if (pointerX >= rect.right - DRAG_EDGE_SCROLL_THRESHOLD) {
        dragEdgeDirectionRef.current = 1;
      } else {
        dragEdgeDirectionRef.current = 0;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      dragPointerXRef.current = event.clientX;
      updateEdgeDirection();
    };

    const tick = () => {
      const container = boardScrollRef.current;
      if (container && dragEdgeDirectionRef.current !== 0) {
        const nextScrollLeft = container.scrollLeft + dragEdgeDirectionRef.current * DRAG_EDGE_SCROLL_SPEED;
        container.scrollLeft = nextScrollLeft;
        lockedScrollLeftRef.current = container.scrollLeft;
      }
      dragScrollFrameRef.current = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    dragScrollFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (dragScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(dragScrollFrameRef.current);
        dragScrollFrameRef.current = null;
      }
      dragPointerXRef.current = null;
      dragEdgeDirectionRef.current = 0;
    };
  }, [activeApplication]);

  function handleDragStart(event: DragStartEvent) {
    if (isReadOnly) return;
    const applicationId = String(event.active.id);
    const application =
      boardQuery.data?.stages
        .flatMap((stage) => stage.applications)
        .find((item) => item.id === applicationId) ?? null;
    setActiveApplication(application);
    setHoverStageId(null);
    lockedScrollLeftRef.current = boardScrollRef.current?.scrollLeft ?? 0;
  }

  function handleDragOver(event: DragOverEvent) {
    if (isReadOnly) return;
    setHoverStageId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (isReadOnly) {
      setActiveApplication(null);
      setHoverStageId(null);
      return;
    }
    if (!event.over) {
      setActiveApplication(null);
      setHoverStageId(null);
      return;
    }
    const applicationId = String(event.active.id);
    const toStageId = String(event.over.id);
    const currentStageId = event.active.data.current?.stageId;
    const currentApplication =
      boardQuery.data?.stages
        .flatMap((stage) => stage.applications)
        .find((application) => application.id === applicationId) ?? null;
    if (toStageId === currentStageId) {
      setActiveApplication(null);
      setHoverStageId(null);
      return;
    }
    if (currentApplication?.interviewMeeting?.status === 'ONGOING') {
      toast.error('This candidate is in an ongoing interview');
      setActiveApplication(null);
      setHoverStageId(null);
      return;
    }

    const isOrgScoped = permissions ? getScope(permissions as never, 'candidates', 'edit') === 'organization' : false;

    if (!isOrgScoped) {
      moveApplication.mutate({ applicationId, toStageId });
      window.requestAnimationFrame(() => {
        setActiveApplication(null);
        setHoverStageId(null);
      });
      return;
    }

    const fromStageName = boardQuery.data?.stages.find((s) => s.id === currentStageId)?.name ?? 'Unknown';
    const toStageName = boardQuery.data?.stages.find((s) => s.id === toStageId)?.name ?? 'Unknown';
    const candidateName = currentApplication
      ? `${currentApplication.candidate.firstName} ${currentApplication.candidate.lastName}`
      : 'Candidate';

    setPendingApplicationIds((prev) => new Set(prev).add(applicationId));
    setFeedbackDialog({
      applicationId,
      fromStageId: currentStageId ?? '',
      toStageId,
      candidateName,
      fromStageName,
      toStageName,
    });
    window.requestAnimationFrame(() => {
      setActiveApplication(null);
      setHoverStageId(null);
    });
  }

  function handleFeedbackSubmit(data: {
    note: string;
    recommendation: 'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'NO_HIRE' | null;
  }) {
    if (!feedbackDialog) return;
    const { applicationId, toStageId } = feedbackDialog;
    moveApplication.mutate(
      {
        applicationId,
        toStageId,
        note: data.note,
        score: null,
        recommendation: data.recommendation,
        strengths: null,
        areasOfImprovement: null,
      },
      {
        onSettled: () => {
          setPendingApplicationIds((prev) => {
            const next = new Set(prev);
            next.delete(applicationId);
            return next;
          });
          setFeedbackDialog(null);
        },
      },
    );
  }

  function handleFeedbackCancel() {
    if (feedbackDialog) {
      setPendingApplicationIds((prev) => {
        const next = new Set(prev);
        next.delete(feedbackDialog.applicationId);
        return next;
      });
    }
    setFeedbackDialog(null);
  }

  function handleCreateStage(data: CreatePipelineStageInput) {
    if (isReadOnly) return;
    void runStageAction({ kind: 'create-stage', data });
  }

  function openSetupDialog(selection: 'new' | 'default' | 'import') {
    if (isReadOnly) return;
    if (!setupRequisitionId) {
      toast.error('This posting is not linked to a requisition yet');
      return;
    }
    setSetupInitialSelection(selection);
    setSetupDialogOpen(true);
  }

  function handleSetupCreateStage(data: SetupCreatePipelineStageInput) {
    if (isReadOnly) return;
    if (!jobPostingId) return;
    void runStageAction({
      kind: 'create-stage',
      data: {
        jobPostingId,
        name: data.name,
        afterStageId: stages[0]?.id ?? null,
        stageType: data.stageType ?? 'DEFAULT',
        dueDate: data.dueDate ?? null,
      },
    });
  }

  async function createSetupDefaultPipeline() {
    if (isReadOnly) return;
    if (!setupRequisitionId) {
      toast.error('This posting is not linked to a requisition yet');
      return;
    }
    try {
      await createDefaultPipeline.mutateAsync();
      setSetupDialogOpen(false);
      await boardQuery.refetch();
      toast.success('Default pipeline created');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create default pipeline'));
    }
  }

  async function importSetupPipeline(sourceJobPostingId: string) {
    if (isReadOnly) return;
    if (!setupRequisitionId) {
      toast.error('This posting is not linked to a requisition yet');
      return;
    }
    try {
      setImportingJobId(sourceJobPostingId);
      await importPipeline.mutateAsync(sourceJobPostingId);
      setSetupDialogOpen(false);
      await boardQuery.refetch();
      toast.success('Pipeline imported');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to import pipeline'));
    } finally {
      setImportingJobId(null);
    }
  }

  function handleRenameStage(data: CreatePipelineStageInput) {
    if (isReadOnly) return;
    if (!renamingStage) return;
    void runStageAction({
      kind: 'update-stage',
      stageId: renamingStage.id,
      data: buildStageUpdateInput(data),
    });
  }

  function openScheduleInterview(application: PipelineApplication) {
    if (isReadOnly) return;
    const eventId = application.currentAssignment?.eventId ?? application.interviewMeeting?.id;
    if (!eventId) {
      toast.error('Interview assignment could not be found. Refresh the pipeline and try again.');
      return;
    }
    void runStageAction({ kind: 'accept-interview', applicationId: application.id, eventId });
  }

  async function connectGoogleForEvaluation() {
    if (!pendingGoogleAction) return;

    try {
      setIsConnectingGoogle(true);
      window.sessionStorage.setItem(pendingStorageKey, JSON.stringify(pendingGoogleAction));
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set(GOOGLE_CONNECT_RETURN_PARAM, '1');

      const requiredScope = requiredGoogleScope();
      const alreadyLinked = await hasGoogleLinked();

      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [requiredScope],
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
      window.sessionStorage.removeItem(pendingStorageKey);
    } catch (error) {
      window.sessionStorage.removeItem(pendingStorageKey);
      toast.error(error instanceof Error ? error.message : 'Google connection failed');
    } finally {
      setIsConnectingGoogle(false);
    }
  }

  function moveStage(stage: PipelineStage, direction: -1 | 1) {
    if (isReadOnly) return;
    const nextOrder = getStageReorderOrder(stages, stage.id, direction);
    if (nextOrder === null) return;
    updateStage.mutate({ stageId: stage.id, data: { order: nextOrder } });
  }

  function openCompleteInterviewDialog(application: PipelineApplication) {
    if (isReadOnly) return;
    setCompletingApplication(application);
    setCompletionNote('');
  }

  function markInterviewCompleted() {
    if (isReadOnly) return;
    const application = completingApplication;
    if (!application) return;
    if (!application.interviewMeeting?.id) return;
    const note = completionNote.trim();
    completeInterviewMeeting.mutate(
      {
        applicationId: application.id,
        eventId: application.interviewMeeting.id,
        data: { notes: note },
      },
      {
        onSuccess: () => {
          setCompletingApplication(null);
          setCompletionNote('');
          toast.success('Interview marked completed');
        },
        onError: (error) => toast.error(readActionError(error, 'Failed to complete interview')),
      },
    );
  }

  async function moveSelectedApplications(applicationIds: string[], toStageId: string) {
    if (isReadOnly) {
      toast.info('This job opening is closed. Pipeline changes are disabled.');
      return;
    }
    const currentApplications = boardQuery.data?.stages.flatMap((stage) => stage.applications) ?? [];
    const applicationsToMove = applicationIds.filter((applicationId) => {
      const application = currentApplications.find((item) => item.id === applicationId);
      return application && application.pipelineStageId !== toStageId && application.interviewMeeting?.status !== 'ONGOING';
    });
    const blockedCount = applicationIds.length - applicationsToMove.length;

    if (applicationsToMove.length === 0) {
      toast.info(blockedCount > 0 ? 'Ongoing interview candidates cannot be moved' : 'Selected candidates are already in that stage');
      return;
    }

    await Promise.all(
      applicationsToMove.map((applicationId) =>
        moveApplication.mutateAsync({ applicationId, toStageId }),
      ),
    );
    toast.success(`${applicationsToMove.length} candidate${applicationsToMove.length === 1 ? '' : 's'} moved`);
    if (blockedCount > 0) {
      toast.info(`${blockedCount} ongoing interview candidate${blockedCount === 1 ? '' : 's'} skipped`);
    }
  }

  function openStageWorkspace(stage: PipelineStage) {
    const basePath = pipelineBasePath ?? (currentPosting?.slug ? `/${orgSlug}/candidates/${currentPosting.slug}/stage` : `/${orgSlug}/candidates/stage`);
    if (currentPosting?.slug) {
      window.sessionStorage.setItem(
        `ats-stage-return:${orgSlug}:${currentPosting.slug}:${stage.slug}`,
        `${window.location.pathname}${window.location.search}`,
      );
    }
    router.push(`${basePath}/${stage.slug}`);
  }

  function handleOpenCandidate(applicationId: string) {
    const slug = currentPosting?.slug;
    if (slug) {
      window.sessionStorage.setItem(
        `ats-candidate-return:${orgSlug}:${slug}:${applicationId}`,
        `${window.location.pathname}${window.location.search}`,
      );
      router.push(`/${orgSlug}/candidates/${slug}/${applicationId}`);
    }
  }

  function handleStartInterview(application: PipelineApplication) {
    if (isReadOnly) return;
    const meeting = application.interviewMeeting;
    if (!meeting || meeting.status !== 'PENDING') return;

    startInterviewMeeting.mutate(
      { applicationId: application.id, eventId: meeting.id },
      {
        onSuccess: (updatedMeeting) => {
          if (updatedMeeting.meetingUrl) {
            window.open(updatedMeeting.meetingUrl, '_blank', 'noopener,noreferrer');
          }
        },
        onError: (error) => {
          toast.error(readActionError(error, 'Failed to start interview'));
          // Fallback: still open the meeting URL if available
          if (meeting.meetingUrl) {
            window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer');
          }
        },
      },
    );
  }

  function handleAcceptInterview(applicationId: string, eventId: string) {
    if (isReadOnly) return;
    void runStageAction({ kind: 'accept-interview', applicationId, eventId });
  }

  async function submitAcceptedInterviewSlots(payload: AcceptInterviewInput) {
    if (isReadOnly) return;
    if (!schedulingRequest) return;
    try {
      await acceptInterview.mutateAsync({
        eventId: schedulingRequest.eventId,
        data: payload,
      });
      toast.success('Slots sent to candidate');
      setSchedulingRequest(null);
      await boardQuery.refetch();
    } catch (error) {
      toast.error(readActionError(error, 'Could not send slots'));
    }
  }

  function handleChooseCandidateSlot(application: PipelineApplication) {
    if (isReadOnly) return;
    const assignment = application.currentAssignment;
    if (!assignment) return;
    const interview = schedulingInterviewFromApplication(application, assignment.eventId);
    const firstCandidateSlot = interview.proposedSlots.find((slot) => slot.proposedBy === 'CANDIDATE');
    setSelectedCandidateSlotId(firstCandidateSlot?.id ?? null);
    setCandidateSlotInterview(interview);
  }

  async function handleBookCandidateSlot() {
    if (isReadOnly) return;
    if (!candidateSlotInterview || !selectedCandidateSlotId) return;
    try {
      await bookCandidateSlot.mutateAsync({
        eventId: candidateSlotInterview.eventId,
        slotId: selectedCandidateSlotId,
      });
      toast.success('Interview slot confirmed');
      setCandidateSlotInterview(null);
      setSelectedCandidateSlotId(null);
      await boardQuery.refetch();
    } catch (error) {
      toast.error(readActionError(error, 'Could not confirm this slot'));
    }
  }

  function handleRejectInterview(applicationId: string, eventId: string) {
    if (isReadOnly) return;
    const application = allBoardApplications.find((item) => item.id === applicationId);
    if (!application) {
      toast.error('Candidate could not be found. Refresh the pipeline and try again.');
      return;
    }
    setRejectRequest({
      applicationId,
      eventId,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`.trim() || application.candidate.email,
      jobPostingId: application.jobPostingId,
      stageId: application.pipelineStageId,
    });
  }

  function submitRejectInterview(payload: RejectInterviewRequest) {
    if (isReadOnly) return;
    if (!rejectRequest) return;
    rejectInterview.mutate(
      { eventId: rejectRequest.eventId, data: payload },
      {
        onSuccess: (result) => {
          setRejectRequest(null);
          toast.success(result.status === 'UNASSIGNED' ? 'Interview rejected and unassigned' : 'Interview rejected and reassigned');
          void boardQuery.refetch();
        },
        onError: (error) => {
          toast.error(readActionError(error, 'Failed to reject interview'));
        },
      },
    );
  }

  const stages = boardQuery.data?.stages ?? EMPTY_STAGES;
  const aiFilteredStages = useMemo(
    () =>
      stages.map((stage) => ({
        ...stage,
        applications: stage.applications.filter((application) => matchesAiFilter(application, aiFilter)),
      })),
    [aiFilter, stages],
  );
  const allApplications = useMemo(
    () => stages.flatMap((stage) => stage.applications),
    [stages],
  );
  const aiRecommendedCount = allApplications.filter(
    (application) => (application.aiScore ?? 0) >= 70 && application.aiEvaluationStatus === 'QUALIFIED',
  ).length;
  const aiFlaggedCount = allApplications.filter((application) => application.isFlaggedForCheating).length;
  const aiFailedCount = allApplications.filter((application) => application.aiAnalysisStatus === 'FAILED').length;
  const onlyAppliedSetup =
    resolvedViewMode === 'kanban' &&
    aiFilteredStages.length === 1 &&
    aiFilteredStages[0]?.name.trim().toLowerCase() === 'applied' &&
    aiFilteredStages[0]?.order === 1;

  useEffect(() => {
    if (!boardQuery.isSuccess || !onlyAppliedSetup || autoOpenedSetupRef.current || !setupRequisitionId || isReadOnly) return;
    autoOpenedSetupRef.current = true;
    const timeout = window.setTimeout(() => {
      setSetupInitialSelection('new');
      setSetupDialogOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [boardQuery.isSuccess, isReadOnly, onlyAppliedSetup, setupRequisitionId]);

  if (!jobPostingId) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
        Select a job posting to open the ATS pipeline.
      </div>
    );
  }

  if (boardQuery.isLoading) {
    return resolvedViewMode === 'table' ? <TableSkeleton /> : <BoardSkeleton />;
  }

  const setupApplications = onlyAppliedSetup
    ? [...(aiFilteredStages[0]?.applications ?? [])]
        .sort((left, right) => {
          const leftTime = new Date(left.lastMovedAt ?? left.appliedDate).getTime();
          const rightTime = new Date(right.lastMovedAt ?? right.appliedDate).getTime();
          return rightTime - leftTime;
        })
        .filter((application) => matchesApplicationSearch(application, aiFilteredStages[0].name, deferredGlobalSearch))
    : [];

  return (
    <>
      {(showJobSelector || !defaultView) && (
        <div className=" flex flex-col gap-3">
          {showJobSelector ? (
            <Select
              value={jobPostingId ?? undefined}
              onValueChange={onJobPostingChange}
              disabled={isLoadingPostings || !jobPostings.length}
            >
              <SelectTrigger className="h-9 w-full bg-white lg:w-[280px]">
                <SelectValue placeholder={isLoadingPostings ? 'Loading jobs' : 'Select job posting'} />
              </SelectTrigger>
              <SelectContent>
                {jobPostings.map((posting) => (
                  <SelectItem key={posting.id} value={posting.id}>
                    {posting.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {!defaultView ? (
            <div className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                aria-pressed={viewMode === 'kanban'}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                  viewMode === 'kanban'
                    ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <KanbanSquare className="size-3.5" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                  viewMode === 'table'
                    ? 'bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <List className="size-3.5" />
                Table
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiFilter('all')}
              aria-pressed={aiFilter === 'all'}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
                aiFilter === 'all'
                  ? 'border-primary bg-primary-ghost text-primary'
                  : 'border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900',
              )}
            >
              All AI
            </button>
            <button
              type="button"
              onClick={() => setAiFilter((current) => current === 'recommended' ? 'all' : 'recommended')}
              aria-pressed={aiFilter === 'recommended'}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                aiFilter === 'recommended'
                  ? 'border-success-border bg-success-bg text-success-text'
                  : 'border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900',
              )}
            >
              <Sparkles className="size-3.5" />
              Recommended
              <span className="font-mono">{aiRecommendedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setAiFilter((current) => current === 'flagged' ? 'all' : 'flagged')}
              aria-pressed={aiFilter === 'flagged'}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors',
                aiFilter === 'flagged'
                  ? 'border-warning-border bg-warning-bg text-warning-text'
                  : 'border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900',
              )}
            >
              <ShieldAlert className="size-3.5" />
              Flagged
              <span className="font-mono">{aiFlaggedCount}</span>
            </button>
            {aiFailedCount > 0 ? (
              <button
                type="button"
                onClick={() => setAiFilter((current) => current === 'failed' ? 'all' : 'failed')}
                aria-pressed={aiFilter === 'failed'}
                className={cn(
                  'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
                  aiFilter === 'failed'
                    ? 'border-destructive-border bg-destructive-bg text-destructive-text'
                    : 'border-neutral-200 bg-surface text-neutral-500 hover:text-neutral-900',
                )}
              >
                Failed <span className="ml-1 font-mono">{aiFailedCount}</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
      {isReadOnly ? (
        <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm font-medium text-warning-text">
          This job opening is closed. The pipeline, table, and stage workspaces are read-only.
        </div>
      ) : null}
      {resolvedViewMode === 'table' ? (
        <AtsPipelineTable
          stages={aiFilteredStages}
          globalSearch={deferredGlobalSearch}
          isMoving={moveApplication.isPending}
          readOnly={isReadOnly}
          onOpenCandidate={handleOpenCandidate}
          onMoveSelected={moveSelectedApplications}
        />
      ) : onlyAppliedSetup ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners}>
          <div className="grid h-[calc(100dvh-124px)] min-w-0 grid-cols-[300px_minmax(0,1fr)] gap-5 overflow-hidden rounded-xl bg-canvas">
            <KanbanColumn
              stage={stages[0]}
              isFirst
              isLast
              filteredApplications={setupApplications}
              previewApplication={null}
              isUpdating={false}
              readOnly={isReadOnly}
              onOpenCandidate={handleOpenCandidate}
              onAddAfter={setAddAfterStageId}
              onRename={setRenamingStage}
              onDelete={(item) => deleteStage.mutate(item.id)}
              onMoveLeft={(item) => moveStage(item, -1)}
              onMoveRight={(item) => moveStage(item, 1)}
              onOpenStageWorkspace={openStageWorkspace}
              onScheduleInterview={openScheduleInterview}
              onCompleteInterview={openCompleteInterviewDialog}
              onStartInterview={handleStartInterview}
              onAcceptInterview={handleAcceptInterview}
              onRejectInterview={handleRejectInterview}
              onChooseCandidateSlot={handleChooseCandidateSlot}
              currentMemberId={memberId}
              pendingApplicationIds={pendingApplicationIds}
            />
            <div className="flex min-h-0 items-center justify-center">
              <PipelineSetupCard
                creatingDefault={createDefaultPipeline.isPending}
                importing={importPipeline.isPending}
                onAddStage={() => openSetupDialog('new')}
                onUseDefault={() => openSetupDialog('default')}
                onImport={() => openSetupDialog('import')}
              />
            </div>
          </div>
        </DndContext>
      ) : (
        <DndContext
          autoScroll={false}
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={() => {
            setActiveApplication(null);
            setHoverStageId(null);
          }}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={boardScrollRef}
            className="flex h-[calc(100dvh-124px)] items-stretch overflow-x-auto overflow-y-hidden no-scrollbar"
            onScroll={(event) => {
              if (!activeApplication) return;
              const container = event.currentTarget;
              if (dragEdgeDirectionRef.current === 0) {
                if (container.scrollLeft !== lockedScrollLeftRef.current) {
                  container.scrollLeft = lockedScrollLeftRef.current;
                }
                return;
              }
              lockedScrollLeftRef.current = container.scrollLeft;
            }}
          >
            {aiFilteredStages.map((stage, index) => {
              const activeStageId = activeApplication?.pipelineStageId ?? null;
              const sortedApplications = [...stage.applications].sort((left, right) => {
                const leftTime = new Date(left.lastMovedAt ?? left.appliedDate).getTime();
                const rightTime = new Date(right.lastMovedAt ?? right.appliedDate).getTime();
                return rightTime - leftTime;
              });
              const filteredApplications = sortedApplications.filter((application) => {
                if (activeApplication && stage.id === activeStageId && application.id === activeApplication.id) {
                  return false;
                }
                return matchesApplicationSearch(application, stage.name, deferredGlobalSearch);
              });
              const previewApplication =
                activeApplication &&
                hoverStageId === stage.id &&
                stage.id !== activeStageId &&
                matchesAiFilter(activeApplication, aiFilter) &&
                matchesApplicationSearch(activeApplication, stage.name, deferredGlobalSearch)
                  ? activeApplication
                  : null;

              const showEmptyState = filteredApplications.length === 0 && previewApplication === null;

              const visibleApplications = showEmptyState
                ? []
                : filteredApplications;

              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  isFirst={index === 0}
                  isLast={index === stages.length - 1}
                  filteredApplications={visibleApplications}
                  previewApplication={previewApplication}
                  isUpdating={updateStage.isPending && updateStage.variables?.stageId === stage.id}
                  readOnly={isReadOnly}
                  onOpenCandidate={handleOpenCandidate}
                  onAddAfter={setAddAfterStageId}
                  onRename={setRenamingStage}
                  onDelete={(item) => deleteStage.mutate(item.id)}
                  onMoveLeft={(item) => moveStage(item, -1)}
                  onMoveRight={(item) => moveStage(item, 1)}
                  onOpenStageWorkspace={openStageWorkspace}
                  onScheduleInterview={openScheduleInterview}
                  onCompleteInterview={openCompleteInterviewDialog}
                  onStartInterview={handleStartInterview}
                  onAcceptInterview={handleAcceptInterview}
                  onRejectInterview={handleRejectInterview}
                  onChooseCandidateSlot={handleChooseCandidateSlot}
                  currentMemberId={memberId}
                  pendingApplicationIds={pendingApplicationIds}
                />
              );
            })}
          </div>
          <DragOverlay zIndex={9999}>
            {activeApplication ? (
              <motion.div
                initial={{ width: 276, scale: 1, opacity: 0.98 }}
                animate={{ width: 248, scale: 0.96, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <CandidateCard application={activeApplication} isOverlay compact draggable={false} dragLocked={isReadOnly} />
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <StageConfigDrawer
        open={addAfterStageId !== null}
        title="Add pipeline stage"
        jobPostingId={jobPostingId}
        afterStageId={addAfterStageId}
        submitting={createStage.isPending}
        onOpenChange={(open) => setAddAfterStageId(open ? addAfterStageId : null)}
        onSubmit={handleCreateStage}
      />
      <StageConfigDrawer
        open={renamingStage !== null}
        title={renamingStage ? `Configure ${renamingStage.name}` : 'Configure stage'}
        stage={renamingStage}
        jobPostingId={jobPostingId}
        submitting={updateStage.isPending}
        onOpenChange={(open) => setRenamingStage(open ? renamingStage : null)}
        onSubmit={handleRenameStage}
      />
      <PipelineSetupDialog
        key={`${setupInitialSelection}-${setupDialogOpen ? 'open' : 'closed'}-${jobPostingId}`}
        open={setupDialogOpen}
        initialSelection={setupInitialSelection}
        orgSlug={orgSlug}
        memberId={memberId}
        requisitionId={setupRequisitionId}
        creatingStage={createStage.isPending}
        creatingDefault={createDefaultPipeline.isPending}
        importingJobId={importingJobId}
        onOpenChange={setSetupDialogOpen}
        onCreateStage={handleSetupCreateStage}
        onCreateDefault={createSetupDefaultPipeline}
        onImport={importSetupPipeline}
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
              onClick={() => setGoogleConnectOpen(false)}
              disabled={isConnectingGoogle}
            >
              Cancel
            </Button>
            <Button type="button" onClick={connectGoogleForEvaluation} disabled={isConnectingGoogle}>
              {isConnectingGoogle ? 'Opening Google' : 'Connect Google'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SchedulingModal
        key={schedulingRequest?.eventId ?? 'closed-kanban-scheduling-modal'}
        interview={schedulingInterview}
        open={schedulingRequest !== null}
        isSubmitting={acceptInterview.isPending}
        onOpenChange={(open) => {
          if (!open) setSchedulingRequest(null);
        }}
        onSubmit={submitAcceptedInterviewSlots}
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
      <RejectInterviewDialog
        key={rejectRequest?.eventId ?? 'reject-interview-dialog'}
        open={rejectRequest !== null}
        interview={rejectRequest}
        orgSlug={orgSlug}
        memberId={memberId}
        isSubmitting={rejectInterview.isPending}
        onOpenChange={(open) => {
          if (!open) setRejectRequest(null);
        }}
        onSubmit={submitRejectInterview}
      />
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
        onSubmit={markInterviewCompleted}
      />
      <StageTransitionFeedbackDialog
        open={feedbackDialog !== null}
        onOpenChange={(open) => {
          if (!open) handleFeedbackCancel();
        }}
        candidateName={feedbackDialog?.candidateName ?? ''}
        fromStageName={feedbackDialog?.fromStageName ?? ''}
        toStageName={feedbackDialog?.toStageName ?? ''}
        onSubmit={handleFeedbackSubmit}
      />
    </>
  );
}
