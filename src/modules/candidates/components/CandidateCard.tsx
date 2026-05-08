'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import { CalendarDays, Gauge } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PipelineApplication } from '@/modules/candidates/types/atsTypes';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatSource(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function CandidateCard({
  application,
  onOpen,
  isOverlay = false,
}: {
  application: PipelineApplication;
  onOpen?: (applicationId: string) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: isOverlay,
    data: { type: 'application', stageId: application.pipelineStageId },
  });

  const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
  const style: CSSProperties | undefined =
    transform && !isOverlay ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => {
        if (!isDragging) onOpen?.(application.id);
      }}
      className={cn(
        'w-full touch-none rounded-lg border border-neutral-100 bg-surface p-3 text-left shadow-[var(--shadow-1)] transition-colors hover:border-neutral-200 active:cursor-grabbing',
        isOverlay ? 'cursor-grabbing border-primary shadow-none' : 'cursor-grab',
        isDragging && !isOverlay && 'opacity-0',
      )}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{fullName}</p>
          <p className="truncate text-xs text-neutral-500">{application.candidate.email}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          {formatDate(application.appliedDate)}
        </span>
        <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-neutral-700">
          {formatSource(application.source)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
          {application.currentStage}
        </span>
        {application.score !== null && (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-neutral-700">
            <Gauge className="size-3.5" />
            {application.score}
          </span>
        )}
      </div>
    </button>
  );
}
