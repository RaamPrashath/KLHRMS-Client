'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MessageSquare, Paperclip, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { KanbanIssue } from './kanban.types';

const priorityStyles: Record<string, string> = {
  high: 'bg-destructive-bg text-destructive-text border-destructive-border',
  medium: 'bg-warning-bg text-warning-text border-warning-border',
  low: 'bg-secondary text-secondary-foreground border-border',
};

const lifecycleStyles: Record<string, string> = {
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-100',
  PENDING_RETURN: 'bg-amber-50 text-amber-700 border-amber-100',
  RETURNED_IN_REPAIR: 'bg-orange-50 text-orange-700 border-orange-100',
  RETURNED_READY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  IN_MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-100',
};

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return '1d ago';
  return `${diff}d ago`;
}

export function KanbanCard({
  issue,
  onOpenSwap,
}: {
  issue: KanbanIssue;
  onOpenSwap: (ticketId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { issue } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assigneeInitial = issue.assignees[0]?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-xl border bg-card p-3 transition-all duration-150',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        isDragging && 'z-50 opacity-40 shadow-[0_8px_24px_rgba(0,0,0,0.1)]',
        'cursor-grab active:cursor-grabbing',
        'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{issue.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{issue.ticketId}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em]',
            priorityStyles[issue.priority] || priorityStyles.medium,
          )}
        >
          {issue.priority}
        </span>
      </div>

      {issue.description && (
        <p className="mt-1.5 line-clamp-1 text-[12px] leading-4 text-muted-foreground">
          {issue.description}
        </p>
      )}

      {issue.assetLifecycleStatusLabel && (
        <div className="mt-2">
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
              lifecycleStyles[issue.assetLifecycleStatus ?? ''] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200',
            )}
          >
            {issue.assetLifecycleStatusLabel}
          </span>
        </div>
      )}

      {issue.swapPreview && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {issue.swapPreview.options.map((option) => (
            <span
              key={option.mode}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                option.available ? 'bg-[#eff6ff] text-[#2454a6]' : 'bg-[#fff1f1] text-[#b3261e]',
              )}
            >
              {option.mode === 'PERMANENT_REPLACEMENT' ? 'Exact' : 'Temp'} {option.availableCount}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {assigneeInitial}
          </div>
          <span className="truncate text-[11px] text-muted-foreground">
            {issue.assignees[0]?.name ?? 'Unassigned'}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2.5 text-[10px] text-muted-foreground">
          {issue.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3" />
              {issue.attachmentCount}
            </span>
          )}
          {issue.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {issue.commentCount}
            </span>
          )}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="size-3" />
            {daysAgo(issue.createdAt)}
          </span>
        </div>
      </div>

      {issue.swapPreview?.requiresReplacementValidation && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSwap(issue.id);
          }}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#111827] px-2.5 py-1 text-[10px] font-semibold text-white"
        >
          <RefreshCcw className="size-3" />
          Swap
        </button>
      )}
    </div>
  );
}
