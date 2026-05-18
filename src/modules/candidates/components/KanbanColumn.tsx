'use client';

import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CandidateCard } from '@/modules/candidates/components/CandidateCard';
import type { PipelineApplication, PipelineStage } from '@/modules/candidates/types/atsTypes';

function formatStageDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export function KanbanColumn({
  stage,
  isFirst,
  isLast,
  onOpenCandidate,
  onAddAfter,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onOpenStageWorkspace,
  onOpenEvaluationWorkspace,
  onScheduleInterview,
  onStartInterview,
  onCompleteInterview,
  filteredApplications,
  previewApplication,
  isUpdating = false,
}: {
  readonly stage: PipelineStage;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onOpenCandidate: (applicationId: string) => void;
  readonly onAddAfter: (stageId: string) => void;
  readonly onRename: (stage: PipelineStage) => void;
  readonly onDelete: (stage: PipelineStage) => void;
  readonly onMoveLeft: (stage: PipelineStage) => void;
  readonly onMoveRight: (stage: PipelineStage) => void;
  readonly onOpenStageWorkspace: (stage: PipelineStage) => void;
  readonly onOpenEvaluationWorkspace: (stage: PipelineStage) => void;
  readonly onScheduleInterview: (application: PipelineApplication) => void;
  readonly onStartInterview: (application: PipelineApplication) => void;
  readonly onCompleteInterview: (
    application: PipelineApplication,
    data?: {
      values?: Array<{ categoryId: string; value: string | number | boolean | null }>;
      notes?: string | null;
    },
  ) => void;
  readonly filteredApplications: PipelineApplication[];
  readonly previewApplication?: PipelineApplication | null;
  readonly isUpdating?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: 'stage' },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[320px] shrink-0 flex-col overflow-hidden px-2 pt-2',
        isLast && !isFirst ? 'border-r-0' : 'border-r border-neutral-200/70',
        isOver && ' bg-neutral-100/90',
      )}
    >
      <header className="sticky top-0 z-10 mb-3">
        <div className="flex min-w-0 items-start gap-2 rounded-xl bg-surface px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStageWorkspace(stage)}
                className="truncate text-left text-sm font-semibold text-neutral-900 hover:text-primary"
              >
                {stage.name}
              </button>
              {stage.evaluationEnabled ? (
                <button
                  type="button"
                  onClick={() => onOpenEvaluationWorkspace(stage)}
                  className="flex shrink-0 items-center text-neutral-400 hover:text-primary"
                  aria-label={`Open ${stage.name} evaluation workspace`}
                >
                  <ExternalLink className="size-3.5 shrink-0 text-neutral-400" />
                </button>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-neutral-500">
                {filteredApplications.length}
                {filteredApplications.length !== stage.applications.length ? ` of ${stage.applications.length}` : ''} candidates
              </p>
              {stage.dueDate ? (
                <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
                  <CalendarDays className="size-3" />
                  {formatStageDate(stage.dueDate)}
                </div>
              ) : null}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`${stage.name} actions`}
                className="size-7 rounded-md text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 mt-1.5"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <MoreVertical className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onAddAfter(stage.id)}>
                <Plus className="size-4" />
                Add after
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(stage)}>
                <Pencil className="size-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isFirst} onClick={() => onMoveLeft(stage)}>
                <ArrowLeft className="size-4" />
                Move left
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isLast} onClick={() => onMoveRight(stage)}>
                <ArrowRight className="size-4" />
                Move right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={stage.isProtected || stage.applications.length > 0}
                variant="destructive"
                onClick={() => onDelete(stage)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar pb-6">
        <AnimatePresence initial={false}>
          {filteredApplications.map((application) => (
            <CandidateCard
              key={application.id}
              application={application}
              onOpen={onOpenCandidate}
              meetingEnabled={stage.meetingEnabled}
              evaluationCategories={stage.evaluationEnabled ? stage.evaluationCategories : []}
              onScheduleInterview={onScheduleInterview}
              onStartInterview={onStartInterview}
              onCompleteInterview={onCompleteInterview}
            />
          ))}
          {previewApplication ? (
            <CandidateCard
              key={`preview-${previewApplication.id}-${stage.id}`}
              application={previewApplication}
              meetingEnabled={stage.meetingEnabled}
              evaluationCategories={stage.evaluationEnabled ? stage.evaluationCategories : []}
              onScheduleInterview={onScheduleInterview}
              onStartInterview={onStartInterview}
              onCompleteInterview={onCompleteInterview}
              compact
              draggable={false}
            />
          ) : null}
        </AnimatePresence>
        {filteredApplications.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4 text-center text-xs text-neutral-500">
            {stage.applications.length === 0 && isFirst && isLast
              ? 'No candidates yet'
              : stage.applications.length === 0
                ? 'Drop candidates here'
                : 'No candidates match'}
          </div>
        )}
      </div>
    </section>
  );
}
