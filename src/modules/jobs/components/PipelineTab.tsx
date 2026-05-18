'use client';

import { KanbanSquare } from 'lucide-react';

import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

interface PipelineTabProps {
  requisition: JobRequisitionRecord;
}

export function PipelineTab({ requisition }: Readonly<PipelineTabProps>) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-ghost text-primary">
          <KanbanSquare className="size-5" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-neutral-900">{requisition.title}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Candidate pipeline and stages will be visible after the job posting is created.
          </p>
        </div>
      </div>
    </div>
  );
}
