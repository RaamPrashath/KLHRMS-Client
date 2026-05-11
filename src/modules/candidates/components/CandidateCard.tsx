'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import { CalendarDays, Check, CheckCircle2, Clock, Gauge, Play, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PipelineApplication } from '@/modules/candidates/types/atsTypes';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export function CandidateCard({
  application,
  onOpen,
  meetingEnabled = false,
  onScheduleInterview,
  onStartInterview,
  onCompleteInterview,
  isOverlay = false,
}: {
  application: PipelineApplication;
  onOpen?: (applicationId: string) => void;
  meetingEnabled?: boolean;
  onScheduleInterview?: (application: PipelineApplication) => void;
  onStartInterview?: (application: PipelineApplication) => void;
  onCompleteInterview?: (application: PipelineApplication) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: isOverlay,
    data: { type: 'application', stageId: application.pipelineStageId },
  });

  const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
  const meeting = application.interviewMeeting;
  const canSchedule = !meeting || meeting.status === 'COMPLETED';
  const showComplete = meeting?.status === 'ONGOING';
  const style: CSSProperties | undefined =
    transform && !isOverlay ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!isDragging) onOpen?.(application.id);
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isDragging) {
          event.preventDefault();
          onOpen?.(application.id);
        }
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{fullName}</p>
          <p className="truncate text-xs text-neutral-500">{application.candidate.email}</p>
        </div>
        {meetingEnabled && meeting ? (
          <div className="flex-shrink-0">
            {meeting.status === 'PENDING' ? (
              <Clock className="size-4 text-warning-text" aria-label="Pending" />
            ) : meeting.status === 'ONGOING' ? (
              <Play className="size-4 text-success-text" aria-label="Ongoing" />
            ) : (
              <CheckCircle2 className="size-4 text-neutral-400" aria-label="Completed" />
            )}
          </div>
        ) : null}
      </div>

      {application.score !== null ? (
        <div className="mt-3 flex justify-end">
          {application.score !== null && (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-neutral-700">
              <Gauge className="size-3.5" />
              {application.score}
            </span>
          )}
        </div>
      ) : null}

      {meetingEnabled && meeting && meeting.status === 'PENDING' ? (
        <div className="mt-3 rounded-md border border-neutral-100 bg-neutral-50 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-neutral-500">
              Meeting scheduled at {formatDateTime(meeting.scheduledStartAt)}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-6 flex-shrink-0"
              aria-label="Edit scheduled interview"
              onClick={(event) => {
                event.stopPropagation();
                onScheduleInterview?.(application);
              }}
            >
              <Settings className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {meetingEnabled && !isOverlay ? (
        <div className={cn('mt-3 grid gap-2', canSchedule || showComplete ? 'grid-cols-2' : 'grid-cols-1')}>
          {canSchedule ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                onScheduleInterview?.(application);
              }}
            >
              <CalendarDays className="size-3.5" />
              Schedule
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onStartInterview?.(application);
            }}
          >
            <Play className="size-3.5" />
            {meeting?.status === 'COMPLETED' ? 'Start again' : 'Start now'}
          </Button>
          {showComplete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                onCompleteInterview?.(application);
              }}
            >
              <Check className="size-3.5" />
              Complete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
