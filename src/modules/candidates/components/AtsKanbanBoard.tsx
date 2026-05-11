'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { FileSpreadsheet, Plus, Search } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CandidateCard } from '@/modules/candidates/components/CandidateCard';
import { CandidateDrawer } from '@/modules/candidates/components/CandidateDrawer';
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
    meetingEnabled: data.meetingEnabled,
    offerLetterEnabled: data.offerLetterEnabled,
    evaluationEnabled: data.evaluationEnabled,
    evaluationType: data.evaluationType,
    evaluationIncludeTotal: data.evaluationIncludeTotal,
    evaluationIncludeAnalysis: data.evaluationIncludeAnalysis,
    dueDate: data.dueDate,
    dueDateEnabled: Boolean(data.dueDate),
    extendToNextWorkingDay: data.extendToNextWorkingDay,
    evaluationCategories: data.evaluationCategories,
  };
}

function actionNeedsGoogle(action: PendingGoogleAction): boolean {
  return action.kind === 'create-interview' || action.data.evaluationEnabled === true;
}

function requiredGoogleScope(action: PendingGoogleAction): string {
  return action.kind === 'create-interview' ? GOOGLE_CALENDAR_SCOPE : GOOGLE_SHEETS_SCOPE;
}

function readGoogleAccounts(data: unknown): Array<{ providerId?: unknown; scopes?: unknown }> {
  return Array.isArray(data)
    ? data.filter((item): item is { providerId?: unknown; scopes?: unknown } => typeof item === 'object' && item !== null)
    : [];
}

function toIstDateTimeInput(value: Date): string {
  const ist = new Date(value.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
}

function istDateTimeInputToIso(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
}

function BoardSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
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
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobPostingId: string | null;
  readonly jobPostings: Array<{ id: string; title: string }>;
  readonly onJobPostingChange: (id: string) => void;
  readonly isLoadingPostings: boolean;
}) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [activeApplication, setActiveApplication] = useState<PipelineApplication | null>(null);
  const [addAfterStageId, setAddAfterStageId] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<PipelineStage | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const deferredGlobalSearch = useDeferredValue(globalSearch);

  const boardQuery = usePipelineBoard(orgSlug, memberId, jobPostingId);
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

  const hasGoogleAccess = useCallback(async (scope: string) => {
    const result = await authClient.listAccounts();
    if (result.error) {
      throw new Error(result.error.message ?? 'Could not check Google connection');
    }

    return readGoogleAccounts(result.data).some((account) => {
      if (account.providerId !== 'google' || !Array.isArray(account.scopes)) return false;
      return account.scopes.includes(scope);
    });
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
        void runStageAction(action, { skipGoogleCheck: true });
      }, 0);
    } catch {
      toast.error('Google connected, but the pending stage change could not be restored');
    }
  }, [jobPostingId, pendingStorageKey, runStageAction]);

  function handleDragStart(event: DragStartEvent) {
    const applicationId = String(event.active.id);
    const application =
      boardQuery.data?.stages
        .flatMap((stage) => stage.applications)
        .find((item) => item.id === applicationId) ?? null;
    setActiveApplication(application);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) {
      setActiveApplication(null);
      return;
    }
    const applicationId = String(event.active.id);
    const toStageId = String(event.over.id);
    const currentStageId = event.active.data.current?.stageId;
    if (toStageId === currentStageId) {
      setActiveApplication(null);
      return;
    }
    moveApplication.mutate({ applicationId, toStageId });
    window.requestAnimationFrame(() => setActiveApplication(null));
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

      const result = await authClient.linkSocial({
        provider: 'google',
        callbackURL: callbackUrl.toString(),
        scopes: [GOOGLE_SHEETS_SCOPE, GOOGLE_CALENDAR_SCOPE],
        disableRedirect: true,
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'Google connection failed');
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
    updateStage.mutate({ stageId: stage.id, data: { order: stage.order + direction } });
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

  function updateColumnSearch(stageId: string, value: string) {
    setColumnSearch((current) => ({ ...current, [stageId]: value }));
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
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Search all candidates"
            className="h-9 bg-white pl-9"
          />
        </div>
        <Select
          value={jobPostingId ?? undefined}
          onValueChange={onJobPostingChange}
          disabled={isLoadingPostings || !jobPostings.length}
        >
          <SelectTrigger className="h-9 w-full bg-white sm:w-[280px]">
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
        <Button size="sm" onClick={() => setAddAfterStageId(stages.at(-1)?.id ?? null)}>
          <Plus className="size-4" />
          Stage
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveApplication(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto p-1 no-scrollbar">
          {stages.map((stage, index) => {
            const stageSearch = columnSearch[stage.id] ?? '';
            const filteredApplications = stage.applications.filter(
              (application) =>
                matchesApplicationSearch(application, stage.name, deferredGlobalSearch) &&
                matchesApplicationSearch(application, stage.name, stageSearch),
            );

            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                isFirst={index === 0}
                isLast={index === stages.length - 1}
                searchValue={stageSearch}
                filteredApplications={filteredApplications}
                onSearchChange={updateColumnSearch}
                onOpenCandidate={setSelectedApplicationId}
                onAddAfter={setAddAfterStageId}
                onRename={setRenamingStage}
                onDelete={(item) => deleteStage.mutate(item.id)}
                onMoveLeft={(item) => moveStage(item, -1)}
                onMoveRight={(item) => moveStage(item, 1)}
                onOpenEvaluationWorkspace={openEvaluationWorkspace}
                onScheduleInterview={openScheduleInterview}
                onStartInterview={startInterviewNow}
                onCompleteInterview={markInterviewCompleted}
              />
            );
          })}
        </div>
        <DragOverlay dropAnimation={null} zIndex={9999}>
          {activeApplication ? (
            <div className="w-[276px]">
              <CandidateCard application={activeApplication} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
            <DialogTitle>Connect Google Workspace</DialogTitle>
            <DialogDescription>
              Evaluation sheets and interview meetings use Google. Connect once, then this action will continue automatically.
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
