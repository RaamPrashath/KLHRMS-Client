'use client';

import { useDroppable } from '@dnd-kit/core';
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';

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
        'flex h-[calc(100vh-200px)] min-h-[520px] w-[300px] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm',
        isOver && 'ring-2 ring-primary bg-primary-ghost',
      )}
    >
      <header className="border-b border-neutral-100 bg-white p-3 ">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              <h2 className="truncate text-sm font-semibold text-neutral-900">{stage.name}</h2>
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
                Rename
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

        <div className="relative mt-3 ">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(stage.id, event.target.value)}
            placeholder="Search column"
            className="h-8 bg-neutral-50 pl-8 text-xs"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {filteredApplications.map((application) => (
          <CandidateCard
            key={application.id}
            application={application}
            onOpen={onOpenCandidate}
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
