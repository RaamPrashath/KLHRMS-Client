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
import { Plus, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { StageFormDialog } from '@/modules/candidates/components/StageFormDialog';
import {
  useCreatePipelineStage,
  useDeletePipelineStage,
  useMoveApplicationStage,
  usePipelineBoard,
  useUpdatePipelineStage,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type { CreatePipelineStageInput } from '@/modules/candidates/schema/atsSchemas';
import type { PipelineApplication, PipelineStage } from '@/modules/candidates/types/atsTypes';

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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    createStage.mutate(data, {
      onSuccess: () => setAddAfterStageId(null),
    });
  }

  function handleRenameStage(data: CreatePipelineStageInput) {
    if (!renamingStage) return;
    updateStage.mutate(
      { stageId: renamingStage.id, data: { name: data.name } },
      { onSuccess: () => setRenamingStage(null) },
    );
  }

  function moveStage(stage: PipelineStage, direction: -1 | 1) {
    updateStage.mutate({ stageId: stage.id, data: { order: stage.order + direction } });
  }

  function updateColumnSearch(stageId: string, value: string) {
    setColumnSearch((current) => ({ ...current, [stageId]: value }));
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

      <StageFormDialog
        open={addAfterStageId !== null}
        title="Add pipeline stage"
        jobPostingId={jobPostingId}
        afterStageId={addAfterStageId}
        submitting={createStage.isPending}
        onOpenChange={(open) => setAddAfterStageId(open ? addAfterStageId : null)}
        onSubmit={handleCreateStage}
      />
      <StageFormDialog
        open={renamingStage !== null}
        title="Rename pipeline stage"
        defaultName={renamingStage?.name}
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
    </>
  );
}
