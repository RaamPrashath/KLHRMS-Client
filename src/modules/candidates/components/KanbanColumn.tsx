'use client';

import { useDroppable } from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Inbox,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useMemo } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

function initials(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface CandidateGroup {
  id: string;
  type: 'my' | 'unassigned' | 'other';
  title: string;
  interviewerName?: string;
  interviewerMemberId?: string;
  candidates: PipelineApplication[];
}

function buildGroups(
  applications: PipelineApplication[],
  currentMemberId: string | null,
): CandidateGroup[] {
  const groups: Record<string, CandidateGroup> = {};
  const myId = 'group:my';
  const unassignedId = 'group:unassigned';

  for (const app of applications) {
    const assignment = app.currentAssignment;
    const interviewer = assignment?.interviewer;
    const memberId = interviewer?.memberId ?? null;

    if (memberId && memberId === currentMemberId) {
      if (!groups[myId]) {
        groups[myId] = { id: myId, type: 'my', title: 'My interviews', candidates: [] };
      }
      groups[myId].candidates.push(app);
    } else if (!memberId) {
      if (!groups[unassignedId]) {
        groups[unassignedId] = { id: unassignedId, type: 'unassigned', title: 'Unassigned', candidates: [] };
      }
      groups[unassignedId].candidates.push(app);
    } else {
      const groupId = `group:${memberId}`;
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          type: 'other',
          title: interviewer?.name ?? 'Unknown interviewer',
          interviewerName: interviewer?.name,
          interviewerMemberId: memberId,
          candidates: [],
        };
      }
      groups[groupId].candidates.push(app);
    }
  }

  const ordered: CandidateGroup[] = [];
  if (groups[myId]) ordered.push(groups[myId]);
  if (groups[unassignedId]) ordered.push(groups[unassignedId]);
  for (const [id, group] of Object.entries(groups)) {
    if (id !== myId && id !== unassignedId) {
      ordered.push(group);
    }
  }
  return ordered;
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
  onScheduleInterview,
  onCompleteInterview,
  onStartInterview,
  onAcceptInterview,
  onRejectInterview,
  filteredApplications,
  previewApplication,
  isUpdating = false,
  currentMemberId = null,
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
  readonly onScheduleInterview: (application: PipelineApplication) => void;
  readonly onStartInterview: (application: PipelineApplication) => void;
  readonly onCompleteInterview: (
    application: PipelineApplication,
    data?: {
      notes?: string | null;
    },
  ) => void;
  readonly onAcceptInterview?: (applicationId: string, eventId: string) => void;
  readonly onRejectInterview?: (applicationId: string, eventId: string) => void;
  readonly filteredApplications: PipelineApplication[];
  readonly previewApplication?: PipelineApplication | null;
  readonly isUpdating?: boolean;
  readonly currentMemberId?: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: 'stage' },
  });

  const groups = useMemo(
    () => (stage.meetingEnabled ? buildGroups(filteredApplications, currentMemberId) : null),
    [filteredApplications, stage.meetingEnabled, currentMemberId],
  );

  const showGroups = groups !== null;

  function renderEmpty() {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4 text-center text-xs text-neutral-500">
        {stage.applications.length === 0 && isFirst && isLast
          ? 'No candidates yet'
          : stage.applications.length === 0
            ? 'Drop candidates here'
            : 'No candidates match'}
      </div>
    );
  }

  function renderCard(application: PipelineApplication) {
    return (
      <CandidateCard
        key={application.id}
        application={application}
        onOpen={onOpenCandidate}
        meetingEnabled={stage.meetingEnabled}
        onScheduleInterview={onScheduleInterview}
        onCompleteInterview={onCompleteInterview}
        onStartInterview={onStartInterview}
        onAcceptInterview={onAcceptInterview}
        onRejectInterview={onRejectInterview}
        currentMemberId={currentMemberId}
      />
    );
  }

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[360px] shrink-0 flex-col overflow-hidden px-2 pt-2',
        isLast && !isFirst ? 'border-r-0' : 'border-r border-neutral-200/70',
        isOver && ' bg-neutral-100/90',
      )}
    >
      <header className="sticky top-0 z-10 mb-3">
        <div className="flex min-w-0 items-start gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStageWorkspace(stage)}
                className="truncate text-left text-sm font-semibold text-neutral-900 hover:text-primary"
              >
                {stage.name}
              </button>
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

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-6">
        {showGroups ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id}>
                <div className="mb-2 flex items-center gap-1.5 px-1">
                  {group.type === 'my' ? (
                    <UserCheck className="size-3.5 text-primary" />
                  ) : group.type === 'unassigned' ? (
                    <Inbox className="size-3.5 text-neutral-400" />
                  ) : (
                    <Avatar className="size-5">
                      <AvatarFallback className="bg-neutral-100 text-[9px] font-medium text-neutral-600">
                        {group.interviewerName ? initials(group.interviewerName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider',
                    group.type === 'my' ? 'text-primary' : group.type === 'unassigned' ? 'text-neutral-500' : 'text-neutral-600',
                  )}>
                    {group.title}
                  </span>
                  <span className="ml-auto text-[10px] font-medium text-neutral-400">{group.candidates.length}</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {group.candidates.map(renderCard)}
                  </AnimatePresence>
                </div>
              </div>
            ))}
            {groups.length === 0 && renderEmpty()}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {previewApplication ? (
                <CandidateCard
                  key={`preview-${previewApplication.id}-${stage.id}`}
                  application={previewApplication}
                  meetingEnabled={stage.meetingEnabled}
                  onScheduleInterview={onScheduleInterview}
                  onCompleteInterview={onCompleteInterview}
                  onStartInterview={onStartInterview}
                  compact
                  draggable={false}
                />
              ) : null}
              {filteredApplications.map(renderCard)}
            </AnimatePresence>
            {filteredApplications.length === 0 && renderEmpty()}
          </div>
        )}
      </div>
    </section>
  );
}
