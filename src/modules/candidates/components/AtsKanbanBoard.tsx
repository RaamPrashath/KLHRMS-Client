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
import { FileSpreadsheet, KanbanSquare, List, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimePicker } from '@/components/ui/time-picker';
import { useCandidatesJobContext } from '@/modules/candidates/components/CandidatesJobContext';
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
import { AtsPipelineTable } from '@/modules/candidates/components/AtsPipelineTable';
import { KanbanColumn } from '@/modules/candidates/components/KanbanColumn';
import { StageConfigDrawer } from '@/modules/candidates/components/StageConfigDrawer';
import { PipelineSetupCard } from '@/modules/jobs/components/PipelineSetupCard';
import { PipelineSetupDialog } from '@/modules/jobs/components/PipelineSetupDialog';
import { authClient } from '@/lib/auth-client';
import {
  useAcceptInterview,
  useCreatePipelineStage,
  useCreateInterviewMeeting,
  useCompleteInterviewMeeting,
  useRejectInterview,
  useStartInterviewMeeting,
  useUpdateInterviewMeeting,
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
  CreateInterviewMeetingInput,
  UpdateInterviewMeetingInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type { PipelineApplication, PipelineStage } from '@/modules/candidates/types/atsTypes';
import type { CreatePipelineStageInput as SetupCreatePipelineStageInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type { RolePermissions } from '@/modules/roles/types/role';

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_CONNECT_RETURN_PARAM = 'atsGoogleConnected';
const DRAG_EDGE_SCROLL_THRESHOLD = 40;
const DRAG_EDGE_SCROLL_SPEED = 18;
const EMPTY_STAGES: PipelineStage[] = [];

type PendingGoogleAction =
  | { kind: 'create-stage'; data: CreatePipelineStageInput }
  | { kind: 'update-stage'; stageId: string; data: UpdatePipelineStageInput }
  | { kind: 'create-interview'; applicationId: string; data: CreateInterviewMeetingInput }
  | { kind: 'reschedule-interview'; applicationId: string; eventId: string; data: UpdateInterviewMeetingInput };

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
    application.score?.toString(),
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
    evaluationEnabled: data.evaluationEnabled,
    sheetEnabled: data.sheetEnabled,
    evaluationType: data.evaluationType,
    evaluationIncludeTotal: data.evaluationIncludeTotal,
    evaluationIncludeAnalysis: data.evaluationIncludeAnalysis,
    dueDate: data.dueDate,
    dueDateEnabled: Boolean(data.dueDate),
    evaluationCategories: data.evaluationCategories,
  };
}

function actionNeedsGoogle(action: PendingGoogleAction): boolean {
  if (action.kind === 'create-interview' || action.kind === 'reschedule-interview') return true;
  return action.data.evaluationEnabled === true;
}

function requiredGoogleScope(action: PendingGoogleAction): string {
  if (action.kind === 'create-interview' || action.kind === 'reschedule-interview') return GOOGLE_CALENDAR_SCOPE;
  return GOOGLE_SHEETS_SCOPE;
}

function permissionErrorForAction(action: PendingGoogleAction, permissions?: RolePermissions | null): string | null {
  if (!permissions) return null;
  const required =
    action.kind === 'create-interview'
      ? { module: 'interviews', action: 'create', label: 'schedule interviews' }
      : action.kind === 'reschedule-interview'
        ? { module: 'interviews', action: 'edit', label: 'reschedule interviews' }
        : { module: 'candidates', action: 'edit', label: 'manage pipeline stages' };

  return permissions[required.module]?.[required.action] === 'organization'
    ? null
    : `You do not have permission to ${required.label}.`;
}

function readGoogleAccounts(data: unknown): Array<{ providerId?: unknown; scope?: unknown; scopes?: unknown }> {
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
        <div key={column} className="flex w-[300px] shrink-0 flex-col rounded-xl border border-neutral-100 bg-surface-subtle">
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
    <div className="rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
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
  const createInterviewMeeting = useCreateInterviewMeeting(orgSlug, memberId, jobPostingId);
  const updateInterviewMeeting = useUpdateInterviewMeeting(orgSlug, memberId, jobPostingId);
  const startInterviewMeeting = useStartInterviewMeeting(orgSlug, memberId, jobPostingId);
  const completeInterviewMeeting = useCompleteInterviewMeeting(orgSlug, memberId, jobPostingId);
  const acceptInterview = useAcceptInterview(orgSlug, memberId);
  const rejectInterview = useRejectInterview(orgSlug, memberId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const pendingStorageKey = useMemo(
    () => `ats-google-pending:${orgSlug}:${jobPostingId ?? 'none'}`,
    [jobPostingId, orgSlug],
  );
  const [pendingGoogleAction, setPendingGoogleAction] = useState<PendingGoogleAction | null>(null);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [schedulingApplication, setSchedulingApplication] = useState<PipelineApplication | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [selectedMinute, setSelectedMinute] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragPointerXRef = useRef<number | null>(null);
  const dragEdgeDirectionRef = useRef<-1 | 0 | 1>(0);
  const lockedScrollLeftRef = useRef(0);
  const dragScrollFrameRef = useRef<number | null>(null);
  const currentPosting = useMemo(
    () => jobPostings.find((posting) => posting.id === jobPostingId) ?? null,
    [jobPostingId, jobPostings],
  );
  const setupRequisitionId = currentPosting?.requisitionId ?? '';
  const createDefaultPipeline = useCreateRequisitionDefaultPipeline(orgSlug, memberId, setupRequisitionId);
  const importPipeline = useImportRequisitionPipeline(orgSlug, memberId, setupRequisitionId);

  const hasGoogleAccess = useCallback(async (scope: string) => {
    const result = await authClient.listAccounts();
    if (result.error) {
      throw new Error(result.error.message ?? 'Could not check Google connection');
    }

    const accounts = readGoogleAccounts(result.data);
    const googleAccount = accounts.find((account) => account.providerId === 'google');
    
    if (!googleAccount) return false;

    return normalizeGoogleScopes(googleAccount).includes(scope);
  }, []);

  const hasGoogleLinked = useCallback(async () => {
    const result = await authClient.listAccounts();
    if (result.error) return false;
    
    return readGoogleAccounts(result.data).some((account) => account.providerId === 'google');
  }, []);

  const requestGoogleConnection = useCallback((action: PendingGoogleAction) => {
    setPendingGoogleAction(action);
    setGoogleConnectOpen(true);
  }, []);

  const runStageAction = useCallback(
    async (action: PendingGoogleAction, options?: { skipGoogleCheck?: boolean }) => {
      const permissionError = permissionErrorForAction(action, permissions);
      if (permissionError) {
        toast.error(permissionError);
        return;
      }

      if (!options?.skipGoogleCheck && actionNeedsGoogle(action)) {
        const hasAccess = await hasGoogleAccess(requiredGoogleScope(action));
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

        if (action.kind === 'create-interview') {
          await createInterviewMeeting.mutateAsync({
            applicationId: action.applicationId,
            data: action.data,
          });
          setSchedulingApplication(null);
          toast.success('Interview scheduled and email sent');
          return;
        }

        if (action.kind === 'reschedule-interview') {
          await updateInterviewMeeting.mutateAsync({
            applicationId: action.applicationId,
            eventId: action.eventId,
            data: action.data,
          });
          setSchedulingApplication(null);
          toast.success('Interview rescheduled and email sent');
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
        toast.error(readActionError(error, action.kind === 'create-interview' ? 'Failed to create meeting' : action.kind === 'create-stage' ? 'Failed to create stage' : 'Failed to update stage'));
      }
    },
    [createInterviewMeeting, createStage, hasGoogleAccess, permissions, requestGoogleConnection, updateInterviewMeeting, updateStage],
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
    setHoverStageId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
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
    moveApplication.mutate({ applicationId, toStageId });
    window.requestAnimationFrame(() => {
      setActiveApplication(null);
      setHoverStageId(null);
    });
  }

  function handleCreateStage(data: CreatePipelineStageInput) {
    void runStageAction({ kind: 'create-stage', data });
  }

  function openSetupDialog(selection: 'new' | 'default' | 'import') {
    if (!setupRequisitionId) {
      toast.error('This posting is not linked to a requisition yet');
      return;
    }
    setSetupInitialSelection(selection);
    setSetupDialogOpen(true);
  }

  function handleSetupCreateStage(data: SetupCreatePipelineStageInput) {
    if (!jobPostingId) return;
    void runStageAction({
      kind: 'create-stage',
      data: {
        jobPostingId,
        name: data.name,
        afterStageId: stages[0]?.id ?? null,
        stageType: data.stageType ?? 'DEFAULT',
        evaluationEnabled: data.evaluationEnabled ?? false,
        sheetEnabled: data.sheetEnabled ?? false,
        evaluationType: data.evaluationType ?? null,
        evaluationIncludeTotal: data.evaluationIncludeTotal ?? false,
        evaluationIncludeAnalysis: data.evaluationIncludeAnalysis ?? false,
        dueDate: data.dueDate ?? null,
        evaluationCategories: (data.evaluationCategories ?? []).map((category, index) => ({
          id: category.id ?? null,
          name: category.name,
          type: category.type ?? 'NUMERIC',
          maxScore: category.maxScore ?? undefined,
          order: category.order ?? index + 1,
        })),
      },
    });
  }

  async function createSetupDefaultPipeline() {
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
    if (!renamingStage) return;
    void runStageAction({
      kind: 'update-stage',
      stageId: renamingStage.id,
      data: buildStageUpdateInput(data),
    });
  }

  async function connectGoogleForEvaluation() {
    if (!pendingGoogleAction) return;

    try {
      setIsConnectingGoogle(true);
      window.sessionStorage.setItem(pendingStorageKey, JSON.stringify(pendingGoogleAction));
      const callbackUrl = new URL(window.location.href);
      callbackUrl.searchParams.set(GOOGLE_CONNECT_RETURN_PARAM, '1');

      const requiredScope = requiredGoogleScope(pendingGoogleAction);
      const alreadyLinked = await hasGoogleLinked();
      
      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [requiredScope],
        disableRedirect: true,
      });
      
      if (result.error) {
        // If account is already linked, this is expected when requesting additional scopes
        // The error might be misleading, but the OAuth flow should still work
        if (alreadyLinked && result.error.message?.includes('already linked')) {
          // Continue with the OAuth flow to request additional scopes
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
    const nextOrder = getStageReorderOrder(stages, stage.id, direction);
    if (nextOrder === null) return;
    updateStage.mutate({ stageId: stage.id, data: { order: nextOrder } });
  }

  function openScheduleInterview(application: PipelineApplication) {
    const existingStart = application.interviewMeeting?.scheduledStartAt;
    const start = existingStart ? new Date(existingStart) : new Date(Date.now() + 60 * 60 * 1000);
    if (!existingStart) start.setMinutes(0, 0, 0);

    setSelectedDate(start);
    setSelectedHour(String(start.getHours()).padStart(2, '0'));
    setSelectedMinute(String(start.getMinutes() < 15 ? '00' : start.getMinutes() < 30 ? '15' : start.getMinutes() < 45 ? '30' : '45'));
    setDurationMinutes(30);
    setSchedulingApplication(application);
  }

  function scheduleInterview() {
    if (!schedulingApplication || !selectedDate || selectedHour === '' || selectedMinute === '') return;

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const hour = parseInt(selectedHour, 10);
    const minute = parseInt(selectedMinute, 10);

    // Construct as IST (+05:30) to match the expected server format
    const istDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`;

    const existingMeeting = schedulingApplication.interviewMeeting;
    if (existingMeeting && existingMeeting.status === 'PENDING') {
      void runStageAction({
        kind: 'reschedule-interview',
        applicationId: schedulingApplication.id,
        eventId: existingMeeting.id,
        data: {
          scheduledStartAt: new Date(istDateStr).toISOString(),
          durationMinutes,
        },
      });
    } else {
      void runStageAction({
        kind: 'create-interview',
        applicationId: schedulingApplication.id,
        data: {
          mode: 'SCHEDULE',
          scheduledStartAt: new Date(istDateStr).toISOString(),
          durationMinutes,
        },
      });
    }
  }

  function markInterviewCompleted(
    application: PipelineApplication,
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    },
  ) {
    if (!application.interviewMeeting?.id) return;
    completeInterviewMeeting.mutate(
      { applicationId: application.id, eventId: application.interviewMeeting.id, data },
      {
        onSuccess: () => toast.success('Interview marked completed'),
        onError: (error) => toast.error(readActionError(error, 'Failed to complete interview')),
      },
    );
  }

  async function moveSelectedApplications(applicationIds: string[], toStageId: string) {
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

  function openEvaluationWorkspace(stage: PipelineStage) {
    if (!stage.evaluationWorkspace?.googleSpreadsheetUrl) {
      toast.error('Evaluation sheet is still being prepared');
      return;
    }
    const url = stage.evaluationWorkspace.googleSheetId === null
      ? stage.evaluationWorkspace.googleSpreadsheetUrl
      : `${stage.evaluationWorkspace.googleSpreadsheetUrl}#gid=${stage.evaluationWorkspace.googleSheetId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openStageWorkspace(stage: PipelineStage) {
    const basePath = pipelineBasePath ?? (currentPosting?.slug ? `/${orgSlug}/candidates/${currentPosting.slug}` : `/${orgSlug}/candidates`);
    const jobContext = basePath.endsWith('/stage') && currentPosting?.slug
      ? `?jobSlug=${encodeURIComponent(currentPosting.slug)}`
      : '';
    router.push(`${basePath}/${stage.slug}${jobContext}`);
  }

  function handleOpenCandidate(applicationId: string) {
    const slug = currentPosting?.slug;
    if (slug) {
      router.push(`/${orgSlug}/candidates/${slug}/${applicationId}`);
    }
  }

  function handleStartInterview(application: PipelineApplication) {
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

  function handleAcceptInterview(_applicationId: string, eventId: string) {
    acceptInterview.mutate(
      { eventId, data: { scheduledStartAt: undefined, durationMinutes: 30 } },
      {
        onSuccess: () => {
          toast.success('Interview accepted');
          void boardQuery.refetch();
        },
        onError: (error) => {
          toast.error(readActionError(error, 'Failed to accept interview'));
        },
      },
    );
  }

  function handleRejectInterview(_applicationId: string, eventId: string) {
    rejectInterview.mutate(
      { eventId },
      {
        onSuccess: () => {
          toast.success('Interview rejected');
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
    if (!boardQuery.isSuccess || !onlyAppliedSetup || autoOpenedSetupRef.current || !setupRequisitionId) return;
    autoOpenedSetupRef.current = true;
    const timeout = window.setTimeout(() => {
      setSetupInitialSelection('new');
      setSetupDialogOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [boardQuery.isSuccess, onlyAppliedSetup, setupRequisitionId]);

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

  const scheduleFormValid = selectedDate !== undefined && selectedHour !== '' && selectedMinute !== '';

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
      {resolvedViewMode === 'table' ? (
        <AtsPipelineTable
          stages={aiFilteredStages}
          globalSearch={deferredGlobalSearch}
          isMoving={moveApplication.isPending}
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
              onOpenCandidate={handleOpenCandidate}
              onAddAfter={setAddAfterStageId}
              onRename={setRenamingStage}
              onDelete={(item) => deleteStage.mutate(item.id)}
              onMoveLeft={(item) => moveStage(item, -1)}
              onMoveRight={(item) => moveStage(item, 1)}
              onOpenStageWorkspace={openStageWorkspace}
              onOpenEvaluationWorkspace={openEvaluationWorkspace}
              onScheduleInterview={openScheduleInterview}
              onCompleteInterview={markInterviewCompleted}
              onStartInterview={handleStartInterview}
              onAcceptInterview={handleAcceptInterview}
              onRejectInterview={handleRejectInterview}
              currentMemberId={memberId}
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
                  onOpenCandidate={handleOpenCandidate}
                  onAddAfter={setAddAfterStageId}
                  onRename={setRenamingStage}
                  onDelete={(item) => deleteStage.mutate(item.id)}
                  onMoveLeft={(item) => moveStage(item, -1)}
                  onMoveRight={(item) => moveStage(item, 1)}
                  onOpenStageWorkspace={openStageWorkspace}
                  onOpenEvaluationWorkspace={openEvaluationWorkspace}
                  onScheduleInterview={openScheduleInterview}
                  onCompleteInterview={markInterviewCompleted}
                  onStartInterview={handleStartInterview}
                  onAcceptInterview={handleAcceptInterview}
                  onRejectInterview={handleRejectInterview}
                  currentMemberId={memberId}
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
                <CandidateCard application={activeApplication} isOverlay compact draggable={false} />
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
              <FileSpreadsheet className="size-5" />
            </div>
            <DialogTitle>
              {pendingGoogleAction?.kind === 'create-interview' || pendingGoogleAction?.kind === 'reschedule-interview'
                ? 'Connect Google Calendar'
                : 'Connect Google Sheets'}
            </DialogTitle>
            <DialogDescription>
              {pendingGoogleAction?.kind === 'create-interview' || pendingGoogleAction?.kind === 'reschedule-interview'
                ? 'Interview meetings need Google Calendar access to create a Meet link and email the candidate.'
                : 'Evaluation workspaces need Google Sheets access. After Google connects, this action will continue automatically.'}
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
      <Dialog open={schedulingApplication !== null} onOpenChange={(open) => setSchedulingApplication(open ? schedulingApplication : null)}>
        <DialogContent className="w-[min(92vw,760px)] sm:max-w-[760px] gap-0 rounded bg-white p-0 shadow-2xl">
          <DialogHeader className="px-8 pt-8 pb-6">
            <DialogTitle>
              {schedulingApplication?.interviewMeeting?.status === 'PENDING' ? 'Reschedule interview' : 'Schedule interview'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose an interview date, time, and duration for this candidate.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const stages = boardQuery.data?.stages ?? [];
            const schedulingStage = schedulingApplication
              ? stages.find((s) => s.id === schedulingApplication.pipelineStageId)
              : undefined;
            const dueDate = schedulingStage?.dueDate ? new Date(schedulingStage.dueDate) : undefined;

            const now = new Date();
            // 5-minute buffer: allow selecting up to 5 mins before current time
            const adjustedNow = new Date(now.getTime() - 5 * 60 * 1000);
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isSelectedToday =
              selectedDate &&
              selectedDate.getFullYear() === now.getFullYear() &&
              selectedDate.getMonth() === now.getMonth() &&
              selectedDate.getDate() === now.getDate();

            const minTime = isSelectedToday
              ? { hour: adjustedNow.getHours(), minute: adjustedNow.getMinutes() }
              : undefined;

            return (
              <div className="grid gap-8 px-8 pb-8 md:grid-cols-2 md:items-start">
                {/* Left: Date */}
                <div className="grid min-w-0 content-start gap-3">
                  <label className="text-sm font-medium text-neutral-700" id="schedule-date-label">
                    Date
                  </label>
                  <Calendar
                    className="w-fit p-0"
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                      } else {
                        setSelectedDate(undefined);
                      }
                    }}
                    disabled={[
                      { before: todayStart },
                      ...(dueDate ? [{ after: dueDate } as const] : []),
                    ]}
                    aria-labelledby="schedule-date-label"
                  />
                  {dueDate ? (
                    <p className="text-xs text-neutral-500">
                      Available until{' '}
                      {dueDate.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </p>
                  ) : null}
                </div>

                {/* Right: Time + Duration */}
                <div className="grid min-w-0 content-start gap-8 md:pt-0.5">
                  {/* Time */}
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-neutral-700" id="schedule-time-label">
                      Time (IST)
                    </label>
                    <TimePicker
                      hour={selectedHour}
                      minute={selectedMinute}
                      onHourChange={setSelectedHour}
                      onMinuteChange={setSelectedMinute}
                      minTime={minTime}
                    />
                    {isSelectedToday ? (
                      <p className="min-h-4 text-xs leading-5 text-neutral-500">
                        Times before{' '}
                        {adjustedNow.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'Asia/Kolkata',
                        })}{' '}
                        are unavailable
                      </p>
                    ) : null}
                  </div>

                  {/* Duration (optional) */}
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-neutral-700" id="schedule-duration-label">
                      Duration <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <Select
                      value={String(durationMinutes)}
                      onValueChange={(value) => setDurationMinutes(Number(value))}
                    >
                      <SelectTrigger className="h-11 w-[140px] rounded-xl border-[#d8dce5] bg-white px-3 text-base shadow-none" aria-labelledby="schedule-duration-label">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#d8dce5]">
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })()}

          {(() => {
            const isReschedule = schedulingApplication?.interviewMeeting?.status === 'PENDING';
            const isPending = createInterviewMeeting.isPending || updateInterviewMeeting.isPending;

            return (
              <DialogFooter className="border-t border-neutral-100 px-8 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSchedulingApplication(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={scheduleInterview}
                  disabled={isPending || !scheduleFormValid}
                >
                  {isPending ? (isReschedule ? 'Rescheduling' : 'Scheduling') : isReschedule ? 'Reschedule' : 'Schedule'}
                </Button>
              </DialogFooter>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
