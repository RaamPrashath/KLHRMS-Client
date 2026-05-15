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
import { FileSpreadsheet, KanbanSquare, List } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { CandidateDrawer } from '@/modules/candidates/components/CandidateDrawer';
import { AtsPipelineTable } from '@/modules/candidates/components/AtsPipelineTable';
import { KanbanColumn } from '@/modules/candidates/components/KanbanColumn';
import { StageConfigDrawer } from '@/modules/candidates/components/StageConfigDrawer';
import { authClient } from '@/lib/auth-client';
import {
  useCreatePipelineStage,
  useCreateInterviewMeeting,
  useCompleteInterviewMeeting,
  useDeletePipelineStage,
  useMoveApplicationStage,
  usePipelineBoard,
  useUpdatePipelineStage,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  CreateInterviewMeetingInput,
  CreatePipelineStageInput,
  UpdatePipelineStageInput,
} from '@/modules/candidates/schema/atsSchemas';
import type { PipelineApplication, PipelineStage } from '@/modules/candidates/types/atsTypes';

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_CONNECT_RETURN_PARAM = 'atsGoogleConnected';
const DRAG_EDGE_SCROLL_THRESHOLD = 40;
const DRAG_EDGE_SCROLL_SPEED = 18;

type PendingGoogleAction =
  | { kind: 'create-stage'; data: CreatePipelineStageInput }
  | { kind: 'update-stage'; stageId: string; data: UpdatePipelineStageInput }
  | { kind: 'create-interview'; applicationId: string; data: CreateInterviewMeetingInput };

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
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
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
    dueDate: data.dueDate,
    dueDateEnabled: Boolean(data.dueDate),
    evaluationCategories: data.evaluationCategories,
  };
}

function actionNeedsGoogle(action: PendingGoogleAction): boolean {
  return action.kind === 'create-interview' || action.data.evaluationEnabled === true;
}

function requiredGoogleScope(action: PendingGoogleAction): string {
  return action.kind === 'create-interview' ? GOOGLE_CALENDAR_SCOPE : GOOGLE_SHEETS_SCOPE;
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

function toIstDateTimeInput(value: Date): string {
  const ist = new Date(value.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
}

function istDateTimeInputToIso(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
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
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((column) => (
          <div key={column} className="h-[calc(100vh-220px)] min-h-[520px] w-[300px] shrink-0 rounded-xl border border-neutral-100 bg-surface-subtle">
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
            <div className="space-y-3 p-3">
              {[1, 2, 3].map((card) => (
                <Skeleton key={card} className="h-[116px] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
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
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobPostingId: string | null;
  readonly jobPostings: Array<{ id: string; slug?: string; title: string; status?: string }>;
  readonly onJobPostingChange: (id: string) => void;
  readonly isLoadingPostings: boolean;
  readonly showJobSelector?: boolean;
  readonly pipelineBasePath?: string;
  readonly defaultView?: 'kanban' | 'table';
}) {
  const router = useRouter();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [activeApplication, setActiveApplication] = useState<PipelineApplication | null>(null);
  const [hoverStageId, setHoverStageId] = useState<string | null>(null);
  const [addAfterStageId, setAddAfterStageId] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<PipelineStage | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    if (typeof window === 'undefined') return 'kanban';
    const stored = window.localStorage.getItem('pipeline-view-preference');
    return stored === 'table' ? 'table' : 'kanban';
  });
  const resolvedViewMode = defaultView ?? viewMode;
  const { searchQuery, addStageSignal } = useCandidatesJobContext();
  const deferredGlobalSearch = useDeferredValue(searchQuery);

  const addStageHandledRef = useRef(0);

  const boardQuery = usePipelineBoard(orgSlug, memberId, jobPostingId);

  useEffect(() => {
    const stages = boardQuery.data?.stages ?? [];
    if (addStageSignal > 0 && addStageSignal !== addStageHandledRef.current) {
      addStageHandledRef.current = addStageSignal;
      setAddAfterStageId(stages.at(-1)?.id ?? null);
    }
  }, [addStageSignal, boardQuery.data?.stages]);
  const moveApplication = useMoveApplicationStage(orgSlug, memberId, jobPostingId);
  const createStage = useCreatePipelineStage(orgSlug, memberId, jobPostingId);
  const updateStage = useUpdatePipelineStage(orgSlug, memberId, jobPostingId);
  const deleteStage = useDeletePipelineStage(orgSlug, memberId, jobPostingId);
  const createInterviewMeeting = useCreateInterviewMeeting(orgSlug, memberId, jobPostingId);
  const completeInterviewMeeting = useCompleteInterviewMeeting(orgSlug, memberId, jobPostingId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const pendingStorageKey = useMemo(
    () => `ats-google-pending:${orgSlug}:${jobPostingId ?? 'none'}`,
    [jobPostingId, orgSlug],
  );
  const [pendingGoogleAction, setPendingGoogleAction] = useState<PendingGoogleAction | null>(null);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [schedulingApplication, setSchedulingApplication] = useState<PipelineApplication | null>(null);
  const [meetingStartLocal, setMeetingStartLocal] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30);
  const pendingMeetingWindowRef = useRef<Window | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const dragPointerXRef = useRef<number | null>(null);
  const dragEdgeDirectionRef = useRef<-1 | 0 | 1>(0);
  const lockedScrollLeftRef = useRef(0);
  const dragScrollFrameRef = useRef<number | null>(null);
  const currentPosting = useMemo(
    () => jobPostings.find((posting) => posting.id === jobPostingId) ?? null,
    [jobPostingId, jobPostings],
  );

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
      if (!options?.skipGoogleCheck && actionNeedsGoogle(action)) {
        const hasAccess = await hasGoogleAccess(requiredGoogleScope(action));
        if (!hasAccess) {
          if (pendingMeetingWindowRef.current) {
            pendingMeetingWindowRef.current.close();
            pendingMeetingWindowRef.current = null;
          }
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
          const meeting = await createInterviewMeeting.mutateAsync({
            applicationId: action.applicationId,
            data: action.data,
          });
          setSchedulingApplication(null);
          if (action.data.mode === 'SCHEDULE') {
            toast.success('Interview scheduled and email sent');
            return;
          }
          toast.success('Interview email sent');
          if (meeting.meetingUrl) {
            if (pendingMeetingWindowRef.current) {
              pendingMeetingWindowRef.current.location.href = meeting.meetingUrl;
              pendingMeetingWindowRef.current = null;
            } else {
              window.open(meeting.meetingUrl, '_blank', 'noopener,noreferrer');
            }
          } else if (pendingMeetingWindowRef.current) {
            pendingMeetingWindowRef.current.close();
            pendingMeetingWindowRef.current = null;
          }
          return;
        }

        await updateStage.mutateAsync({
          stageId: action.stageId,
          data: action.data,
        });
        setRenamingStage(null);
      } catch (error) {
        if (!options?.skipGoogleCheck && isGoogleConnectError(error)) {
          if (pendingMeetingWindowRef.current) {
            pendingMeetingWindowRef.current.close();
            pendingMeetingWindowRef.current = null;
          }
          requestGoogleConnection(action);
          return;
        }
        if (pendingMeetingWindowRef.current) {
          pendingMeetingWindowRef.current.close();
          pendingMeetingWindowRef.current = null;
        }
        toast.error(readActionError(error, action.kind === 'create-interview' ? 'Failed to create meeting' : action.kind === 'create-stage' ? 'Failed to create stage' : 'Failed to update stage'));
      }
    },
    [createInterviewMeeting, createStage, hasGoogleAccess, requestGoogleConnection, updateStage],
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
    if (toStageId === currentStageId) {
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

  function startInterviewNow(application: PipelineApplication) {
    pendingMeetingWindowRef.current = window.open('about:blank', '_blank');
    if (pendingMeetingWindowRef.current) {
      pendingMeetingWindowRef.current.opener = null;
    }
    void runStageAction({
      kind: 'create-interview',
      applicationId: application.id,
      data: {
        mode: 'START_NOW',
        durationMinutes: 30,
      },
    });
  }

  function openScheduleInterview(application: PipelineApplication) {
    const existingStart = application.interviewMeeting?.scheduledStartAt;
    const start = existingStart ? new Date(existingStart) : new Date(Date.now() + 60 * 60 * 1000);
    if (!existingStart) start.setMinutes(0, 0, 0);
    setMeetingStartLocal(toIstDateTimeInput(start));
    setMeetingDuration(30);
    setSchedulingApplication(application);
  }

  function markInterviewCompleted(application: PipelineApplication) {
    if (!application.interviewMeeting?.id) return;
    completeInterviewMeeting.mutate(
      { applicationId: application.id, eventId: application.interviewMeeting.id },
      {
        onSuccess: () => toast.success('Interview marked completed'),
        onError: (error) => toast.error(readActionError(error, 'Failed to complete interview')),
      },
    );
  }

  function scheduleInterview() {
    if (!schedulingApplication || !meetingStartLocal) return;
    void runStageAction({
      kind: 'create-interview',
      applicationId: schedulingApplication.id,
      data: {
        mode: 'SCHEDULE',
        scheduledStartAt: istDateTimeInputToIso(meetingStartLocal),
        durationMinutes: meetingDuration,
      },
    });
  }

  async function moveSelectedApplications(applicationIds: string[], toStageId: string) {
    const currentApplications = boardQuery.data?.stages.flatMap((stage) => stage.applications) ?? [];
    const applicationsToMove = applicationIds.filter((applicationId) => {
      const application = currentApplications.find((item) => item.id === applicationId);
      return application && application.pipelineStageId !== toStageId;
    });

    if (applicationsToMove.length === 0) {
      toast.info('Selected candidates are already in that stage');
      return;
    }

    await Promise.all(
      applicationsToMove.map((applicationId) =>
        moveApplication.mutateAsync({ applicationId, toStageId }),
      ),
    );
    toast.success(`${applicationsToMove.length} candidate${applicationsToMove.length === 1 ? '' : 's'} moved`);
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
    const basePath = pipelineBasePath ?? (currentPosting?.slug ? `/${orgSlug}/jobs/${currentPosting.slug}/pipeline` : `/${orgSlug}/candidates`);
    router.push(`${basePath}/${stage.slug}`);
  }

  if (!jobPostingId) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
        Select a job posting to open the ATS pipeline.
      </div>
    );
  }

  if (boardQuery.isLoading) {
    return <BoardSkeleton />;
  }

  const stages = boardQuery.data?.stages ?? [];

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
        </div>
      )}
      {resolvedViewMode === 'table' ? (
        <AtsPipelineTable
          stages={stages}
          globalSearch={deferredGlobalSearch}
          isMoving={moveApplication.isPending}
          onOpenCandidate={setSelectedApplicationId}
          onMoveSelected={moveSelectedApplications}
        />
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
            className="flex h-[calc(100dvh-140px)] items-stretch overflow-x-auto overflow-y-hidden no-scrollbar"
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
            {stages.map((stage, index) => {
              const activeStageId = activeApplication?.pipelineStageId ?? null;
              const filteredApplications = stage.applications.filter((application) => {
                if (activeApplication && stage.id === activeStageId && application.id === activeApplication.id) {
                  return false;
                }
                return matchesApplicationSearch(application, stage.name, deferredGlobalSearch);
              });
              const previewApplication =
                activeApplication &&
                hoverStageId === stage.id &&
                stage.id !== activeStageId &&
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
                  onOpenCandidate={setSelectedApplicationId}
                  onAddAfter={setAddAfterStageId}
                  onRename={setRenamingStage}
                  onDelete={(item) => deleteStage.mutate(item.id)}
                  onMoveLeft={(item) => moveStage(item, -1)}
                  onMoveRight={(item) => moveStage(item, 1)}
                  onOpenStageWorkspace={openStageWorkspace}
                  onOpenEvaluationWorkspace={openEvaluationWorkspace}
                  onScheduleInterview={openScheduleInterview}
                  onStartInterview={startInterviewNow}
                  onCompleteInterview={markInterviewCompleted}
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
        title="Configure pipeline stage"
        stage={renamingStage}
        jobPostingId={jobPostingId}
        submitting={updateStage.isPending}
        onOpenChange={(open) => setRenamingStage(open ? renamingStage : null)}
        onSubmit={handleRenameStage}
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
      <Dialog open={googleConnectOpen} onOpenChange={setGoogleConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-ghost text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <DialogTitle>
              {pendingGoogleAction?.kind === 'create-interview' ? 'Connect Google Calendar' : 'Connect Google Sheets'}
            </DialogTitle>
            <DialogDescription>
              {pendingGoogleAction?.kind === 'create-interview'
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>
              Create a Google Meet event and email the candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
              Start time (IST)
              <Input
                type="datetime-local"
                value={meetingStartLocal}
                onChange={(event) => setMeetingStartLocal(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
              Duration
              <Select value={String(meetingDuration)} onValueChange={(value) => setMeetingDuration(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSchedulingApplication(null)}
              disabled={createInterviewMeeting.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={scheduleInterview} disabled={createInterviewMeeting.isPending || !meetingStartLocal}>
              {createInterviewMeeting.isPending ? 'Scheduling' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
