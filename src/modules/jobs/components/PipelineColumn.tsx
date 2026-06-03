'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PipelineStageRecord } from '@/modules/jobs/types/jobRequisitionTypes';

function stageTone(stageType: PipelineStageRecord['stageType']) {
  if (stageType === 'HIRED') return 'bg-success-bg text-success-text';
  if (stageType === 'REJECTED') return 'bg-destructive-bg text-destructive-text';
  if (stageType === 'INTERVIEW') return 'bg-info-bg text-info-text';
  if (stageType === 'OFFER') return 'bg-warning-bg text-warning-text';
  if (stageType === 'ONBOARDING') return 'bg-info-bg text-info-text';
  return 'bg-neutral-50 text-neutral-500';
}

function stageTypeLabel(stageType: PipelineStageRecord['stageType']) {
  if (stageType === 'HIRED') return 'Accepted';
  return stageType.replace('_', ' ');
}

interface PipelineColumnProps {
  stage: PipelineStageRecord;
  candidateCount?: number;
}

export function PipelineColumn({ stage, candidateCount = 0 }: Readonly<PipelineColumnProps>) {
  const isApplied = stage.name.trim().toLowerCase() === 'applied' && stage.order === 1;

  return (
    <section className="flex min-h-[420px] w-[280px] shrink-0 flex-col rounded-xl border border-neutral-100 bg-neutral-50/50">
      <header className="border-b border-neutral-100 bg-surface px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="mt-1 size-2.5 shrink-0 rounded-lg bg-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-neutral-900">{stage.name}</h3>
              <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {candidateCount}
              </span>
            </div>
            <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', stageTone(stage.stageType))}>
              {stageTypeLabel(stage.stageType)}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-8 text-neutral-400 hover:text-neutral-700"
                aria-label={`${stage.name} actions`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem disabled>
                <Pencil className="size-4" />
                Rename in ATS
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled variant="destructive">
                <Trash2 className="size-4" />
                {isApplied ? 'Applied is protected' : 'Delete in ATS'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-4">
        <p className="rounded-xl border border-dashed border-neutral-200 bg-surface px-4 py-3 text-center text-xs text-neutral-500">
          No candidates yet
        </p>
      </div>
    </section>
  );
}
