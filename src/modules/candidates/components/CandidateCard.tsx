'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, CheckCircle2, Clock, Gauge, Play, Settings } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

function formatTimeOnly(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatDuration(startStr: string, endStr: string): string {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

export function CandidateCard({
  application,
  onOpen,
  meetingEnabled = false,
  onScheduleInterview,
  onStartInterview,
  onCompleteInterview,
  isOverlay = false,
  compact = false,
  draggable = true,
}: {
  application: PipelineApplication;
  onOpen?: (applicationId: string) => void;
  meetingEnabled?: boolean;
  onScheduleInterview?: (application: PipelineApplication) => void;
  onStartInterview?: (application: PipelineApplication) => void;
  onCompleteInterview?: (application: PipelineApplication) => void;
  isOverlay?: boolean;
  compact?: boolean;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: isOverlay || !draggable,
    data: { type: 'application', stageId: application.pipelineStageId },
  });

  const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
  const meeting = application.interviewMeeting;
  const canSchedule = !meeting || meeting.status === 'COMPLETED';
  const showComplete = meeting?.status === 'ONGOING';
  const style: CSSProperties | undefined =
    transform && !isOverlay ? { transform: CSS.Translate.toString(transform) } : undefined;
  const [ongoingOpen, setOngoingOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!isDragging && draggable) onOpen?.(application.id);
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isDragging && draggable) {
          event.preventDefault();
          onOpen?.(application.id);
        }
      }}
      className={cn(
        'w-full touch-none rounded-xl bg-surface text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-200 ease-out',
        compact ? 'p-3.5' : 'p-3',
        isOverlay
          ? 'cursor-grabbing shadow-[0_12px_28px_rgba(0,0,0,0.12)]'
          : draggable
            ? 'cursor-grab hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:cursor-grabbing'
            : 'cursor-default',
        isDragging && !isOverlay && 'opacity-0',
      )}
      transition={{ layout: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
      {...(!isOverlay && draggable ? listeners : {})}
      {...(!isOverlay && draggable ? attributes : {})}
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
              <Popover open={ongoingOpen} onOpenChange={setOngoingOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative size-4"
                    aria-label="Ongoing"
                    onMouseEnter={() => setOngoingOpen(true)}
                    onMouseLeave={() => setOngoingOpen(false)}
                  >
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="absolute size-3.5 rounded-full bg-yellow-500/30 animate-ping" />
                      <span className="relative size-2 rounded-full bg-yellow-500" />
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-56 p-3" onMouseEnter={() => setOngoingOpen(true)} onMouseLeave={() => setOngoingOpen(false)}>
                  {meeting.interviewerName ? (
                    <p className="text-xs font-medium text-neutral-700">
                      In interview with {meeting.interviewerName}
                    </p>
                  ) : null}
                  <p className="text-xs text-neutral-500">
                    Started at {formatTimeOnly(meeting.scheduledStartAt)}
                  </p>
                </PopoverContent>
              </Popover>
            ) : (
              <Popover open={completedOpen} onOpenChange={setCompletedOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Completed"
                    onMouseEnter={() => setCompletedOpen(true)}
                    onMouseLeave={() => setCompletedOpen(false)}
                  >
                    <CheckCircle2 className="size-4 text-neutral-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-56 p-3" onMouseEnter={() => setCompletedOpen(true)} onMouseLeave={() => setCompletedOpen(false)}>
                  {meeting.interviewerName ? (
                    <p className="text-xs font-medium text-neutral-700">
                      Completed by {meeting.interviewerName}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatTimeOnly(meeting.scheduledStartAt)} – {formatTimeOnly(meeting.completedAt ?? meeting.scheduledEndAt)}
                    <span className="ml-1 text-neutral-400">
                      ({formatDuration(meeting.scheduledStartAt, meeting.completedAt ?? meeting.scheduledEndAt)})
                    </span>
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {!compact && application.score !== null ? (
          <motion.div
            key="score"
            layout
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-end overflow-hidden"
          >
            <span className="inline-flex items-center gap-1 font-mono text-xs text-neutral-700">
              <Gauge className="size-3.5" />
              {application.score}
            </span>
          </motion.div>
        ) : null}

        {!compact && meetingEnabled && meeting && meeting.status === 'PENDING' ? (
          <motion.div
            key="meeting"
            layout
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-md border border-neutral-100 bg-neutral-50 p-2">
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
          </motion.div>
        ) : null}

        {!compact && meetingEnabled && !isOverlay ? (
          <motion.div
            key="actions"
            layout
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn('grid gap-2 overflow-hidden', canSchedule || showComplete ? 'grid-cols-2' : 'grid-cols-1')}
          >
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
