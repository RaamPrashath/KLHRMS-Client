'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
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
import { Input } from '@/components/ui/input';
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
  onOpenEvaluationWorkspace,
  onScheduleInterview,
  onStartInterview,
  onCompleteInterview,
  searchValue,
  onSearchChange,
  filteredApplications,
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
  readonly onOpenEvaluationWorkspace: (stage: PipelineStage) => void;
  readonly onScheduleInterview: (application: PipelineApplication) => void;
  readonly onStartInterview: (application: PipelineApplication) => void;
  readonly onCompleteInterview: (application: PipelineApplication) => void;
  readonly searchValue: string;
  readonly onSearchChange: (stageId: string, value: string) => void;
  readonly filteredApplications: PipelineApplication[];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: 'stage' },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-[300px] shrink-0 flex-col rounded-xl bg-white shadow-sm',
        isOver && 'ring-2 ring-primary bg-primary-ghost',
      )}
    >
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              {stage.evaluationEnabled ? (
                <button
                  type="button"
                  onClick={() => onOpenEvaluationWorkspace(stage)}
                  className="flex min-w-0 items-center gap-1 text-left text-sm font-semibold text-neutral-900 hover:text-primary"
                >
                  <span className="truncate">{stage.name}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-neutral-400" />
                </button>
              ) : (
                <h2 className="truncate text-sm font-semibold text-neutral-900">{stage.name}</h2>
              )}
              {stage.dueDate ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text flex-shrink-0">
                  <CalendarDays className="size-3" />
                  {formatStageDate(stage.dueDate)}
                </div>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {filteredApplications.length}
              {filteredApplications.length !== stage.applications.length ? ` of ${stage.applications.length}` : ''} candidates
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`${stage.name} actions`}>
                <MoreHorizontal className="size-4" />
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

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(stage.id, event.target.value)}
            placeholder="Search column"
            className="h-8 bg-neutral-50 pl-8 text-xs"
          />
        </div>
      </header>

      <div className="space-y-3 p-3 pb-6">
        {filteredApplications.map((application) => (
          <CandidateCard
            key={application.id}
            application={application}
            onOpen={onOpenCandidate}
            meetingEnabled={stage.meetingEnabled}
            onScheduleInterview={onScheduleInterview}
            onStartInterview={onStartInterview}
            onCompleteInterview={onCompleteInterview}
          />
        ))}
        {filteredApplications.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-4 text-center text-xs text-neutral-500">
            {stage.applications.length === 0 ? 'Drop candidates here' : 'No candidates match'}
          </div>
        )}
      </div>
    </section>
  );
}
