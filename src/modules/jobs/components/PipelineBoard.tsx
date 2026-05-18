'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PipelineColumn } from '@/modules/jobs/components/PipelineColumn';
import type { PipelineStageRecord } from '@/modules/jobs/types/jobRequisitionTypes';

interface PipelineBoardProps {
  stages: PipelineStageRecord[];
  onAddStage: () => void;
}

export function PipelineBoard({ stages, onAddStage }: Readonly<PipelineBoardProps>) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-h-[calc(100vh-320px)] items-stretch gap-4">
        {stages.map((stage) => (
          <PipelineColumn key={stage.id} stage={stage} />
        ))}

        <div className="flex w-[280px] shrink-0 items-start">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-start border-dashed bg-surface text-neutral-500 hover:bg-primary-ghost hover:text-primary"
            onClick={onAddStage}
          >
            <Plus className="size-4" />
            Add stage
          </Button>
        </div>
      </div>
    </div>
  );
}
