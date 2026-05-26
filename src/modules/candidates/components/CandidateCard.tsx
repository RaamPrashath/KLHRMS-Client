'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { isSameDay } from 'date-fns';
import { CalendarDays, Check, CheckCircle2, Clock, Copy, Gauge, Play, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

function aiStatusLabel(status: string | null): string | null {
  if (!status) return null;
  if (status === 'PENDING' || status === 'PROCESSING' || status === 'TEXT_EXTRACTED') return 'Analyzing';
  if (status === 'UNSUPPORTED') return 'Unsupported';
  if (status === 'FAILED') return 'AI failed';
  return null;
}

function aiStatusClass(status: string | null): string {
  if (status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'UNSUPPORTED') return 'bg-neutral-50 text-neutral-500';
  return 'bg-info-bg text-info-text';
}

export function CandidateCard({
  application,
  onOpen,
  meetingEnabled = false,
  onScheduleInterview,
  onStartInterview,
  onCompleteInterview,
  onAcceptInterview,
  onRejectInterview,
  isOverlay = false,
  compact = false,
  draggable = true,
  dragLocked = false,
  currentMemberId = null,
}: {
  application: PipelineApplication;
  onOpen?: (applicationId: string) => void;
  meetingEnabled?: boolean;
  onScheduleInterview?: (application: PipelineApplication) => void;
  onStartInterview?: (application: PipelineApplication) => void;
  onCompleteInterview?: (
    application: PipelineApplication,
    data?: {
      notes?: string | null;
    },
  ) => void;
  onAcceptInterview?: (applicationId: string, eventId: string) => void;
  onRejectInterview?: (applicationId: string, eventId: string) => void;
  isOverlay?: boolean;
  compact?: boolean;
  draggable?: boolean;
  dragLocked?: boolean;
  currentMemberId?: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: isOverlay || !draggable || dragLocked || application.interviewMeeting?.status === 'ONGOING',
    data: { type: 'application', stageId: application.pipelineStageId },
  });

  const fullName = `${application.candidate.firstName} ${application.candidate.lastName}`;
  const initials = `${application.candidate.firstName[0] ?? ''}${application.candidate.lastName[0] ?? ''}`.toUpperCase();
  const imageSrc = application.candidate.image?.trim() || null;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const candidateImage = imageSrc && failedImageSrc !== imageSrc ? imageSrc : null;
  const meeting = application.interviewMeeting;
  const assignment = application.currentAssignment;
  const hasPendingAssignment = assignment !== null && meeting === null;
  const canSchedule = !meeting || meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED' || meeting.status === 'RESCHEDULED';
  const isOngoing = meeting?.status === 'ONGOING';
  const isPending = meeting?.status === 'PENDING';
  const isScheduledToday = meeting?.scheduledStartAt ? isSameDay(new Date(meeting.scheduledStartAt), new Date()) : false;
  const canDrag = draggable && !dragLocked && meeting?.status !== 'ONGOING';
  const style: CSSProperties | undefined =
    transform && !isOverlay ? { transform: CSS.Translate.toString(transform) } : undefined;
  const [ongoingOpen, setOngoingOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const aiStatus = aiStatusLabel(application.aiAnalysisStatus);
  const isAiRecommended = (application.aiScore ?? 0) >= 70 && application.aiEvaluationStatus === 'QUALIFIED';

  return (
    <>
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
          : canDrag
            ? 'cursor-grab hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:cursor-grabbing'
            : 'cursor-default',
        isDragging && !isOverlay && 'opacity-0',
      )}
      transition={{ layout: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
      {...(!isOverlay && canDrag ? listeners : {})}
      {...(!isOverlay && canDrag ? attributes : {})}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            key={candidateImage ?? 'fallback'}
            src={candidateImage ?? undefined}
            alt={fullName}
            referrerPolicy="no-referrer"
            onError={() => setFailedImageSrc(imageSrc)}
          />
          <AvatarFallback className="bg-primary-ghost text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{fullName}</p>
          <p className="truncate text-xs text-neutral-500">{application.candidate.email}</p>
        </div>
        {meetingEnabled && (meeting || hasPendingAssignment) ? (
          <div className="flex-shrink-0">
            {hasPendingAssignment && assignment ? (
              <Popover open={scheduledOpen} onOpenChange={setScheduledOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Pending assignment"
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={() => setScheduledOpen(true)}
                    onMouseLeave={() => setScheduledOpen(false)}
                  >
                    <Clock className="size-4 text-info-text" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-60 p-3" onMouseEnter={() => setScheduledOpen(true)} onMouseLeave={() => setScheduledOpen(false)}>
                  <p className="text-xs font-medium text-neutral-700">
                    Pending acceptance by {assignment.interviewer?.name ?? 'interviewer'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Awaiting interviewer response
                  </p>
                </PopoverContent>
              </Popover>
            ) : meeting?.status === 'PENDING' ? (
              <Popover open={scheduledOpen} onOpenChange={setScheduledOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Scheduled interview"
                    onClick={(event) => event.stopPropagation()}
                    onMouseEnter={() => setScheduledOpen(true)}
                    onMouseLeave={() => setScheduledOpen(false)}
                  >
                    <Clock className="size-4 text-warning-text" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-60 p-3" onMouseEnter={() => setScheduledOpen(true)} onMouseLeave={() => setScheduledOpen(false)}>
                  <p className="text-xs font-medium text-neutral-700">
                    Scheduled with {meeting.interviewerName ?? 'unassigned interviewer'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDateTime(meeting.scheduledStartAt)}
                  </p>
                </PopoverContent>
              </Popover>
            ) : meeting?.status === 'ONGOING' ? (
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
            ) : meeting?.status === 'COMPLETED' ? (
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
                  <p className="text-xs text-neutral-500">
                    {formatTimeOnly(meeting.scheduledStartAt)} - {formatTimeOnly(meeting.completedAt ?? meeting.scheduledEndAt)}
                    <span className="ml-1 text-neutral-400">
                      ({formatDuration(meeting.scheduledStartAt, meeting.completedAt ?? meeting.scheduledEndAt)})
                    </span>
                  </p>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        ) : null}
      </div>

      {!compact && (application.aiScore !== null || aiStatus || application.isFlaggedForCheating) ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {application.aiScore !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-ghost px-2 py-0.5 font-mono text-xs font-medium text-primary">
              <Gauge className="size-3.5" />
              AI {application.aiScore}
            </span>
          ) : null}
          {isAiRecommended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
              <Sparkles className="size-3.5" />
              Recommended
            </span>
          ) : null}
          {application.isFlaggedForCheating ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
              <ShieldAlert className="size-3.5" />
              Suspicious text
            </span>
          ) : null}
          {aiStatus ? (
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', aiStatusClass(application.aiAnalysisStatus))}>
              {aiStatus}
            </span>
          ) : null}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {!compact && meetingEnabled && meeting && isPending ? (
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
                  {meeting.interviewerName ?? 'Interview'} at {formatDateTime(meeting.scheduledStartAt)}
                </p>
                <TooltipProvider>
                  <Tooltip
                    open={copied ? true : undefined}
                    onOpenChange={(open) => { if (!copied && !open) setCopied(false); }}
                  >
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-6 flex-shrink-0"
                        aria-label="Copy meeting link"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (meeting.meetingUrl) {
                            navigator.clipboard.writeText(meeting.meetingUrl)
                              .then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              })
                              .catch(() => {});
                          }
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      {copied ? 'Copied!' : 'Copy meeting link'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
            className={cn(
              'grid gap-2 overflow-hidden',
              hasPendingAssignment || isPending ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            {hasPendingAssignment && onScheduleInterview ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs col-span-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onScheduleInterview?.(application);
                }}
              >
                <CalendarDays className="size-3.5" />
                Schedule interview
              </Button>
            ) : null}
            {hasPendingAssignment && assignment?.interviewer?.memberId === currentMemberId && onAcceptInterview && onRejectInterview ? (
              <div className="col-span-full flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8 flex-1 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAcceptInterview(application.id, assignment.eventId);
                  }}
                >
                  <Check className="size-3.5" />
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs text-destructive-text border-destructive-text/30 hover:bg-destructive-text/5"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRejectInterview(application.id, assignment.eventId);
                  }}
                >
                  <X className="size-3.5" />
                  Reject
                </Button>
              </div>
            ) : null}
            {canSchedule && !hasPendingAssignment && onScheduleInterview ? (
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
                {meeting?.status === 'COMPLETED' ? 'Schedule again' : 'Schedule'}
              </Button>
            ) : null}
            {isPending && onScheduleInterview ? (
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
                Reschedule
              </Button>
            ) : null}
            {isPending ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex w-full">
                      <Button
                        type="button"
                        size="sm"
                        className={cn('h-8 w-full text-xs', !isScheduledToday && 'pointer-events-none opacity-50')}
                        disabled={!isScheduledToday}
                        onClick={(event) => {
                          event.stopPropagation();
                          onStartInterview?.(application);
                        }}
                      >
                        <Play className="size-3.5" />
                        Join
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isScheduledToday ? (
                    <TooltipContent side="top" align="center">
                      Can only join on the scheduled day
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {isOngoing ? (
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
    </>
  );
}
