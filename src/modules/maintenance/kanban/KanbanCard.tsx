'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MessageSquare, Paperclip, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { KanbanIssue } from './kanban.types';

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
  onOpenIssue,
}: {
  issue: KanbanIssue;
  onOpenSwap: (ticketId: string) => void;
  onOpenIssue: (issue: KanbanIssue) => void;
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
      onClick={() => onOpenIssue(issue)}
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
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              issue.ticketMode === 'ASSET_ISSUE'
                ? 'bg-[#fff3f2] text-[#b3261e]'
                : 'bg-[#f4f8ff] text-[#2454a6]',
            )}
          >
            {issue.ticketMode === 'ASSET_ISSUE' ? 'Asset' : 'General'}
          </span>
      </div>

      {issue.description && (
        <p className="mt-1.5 line-clamp-1 text-[12px] leading-4 text-muted-foreground">
          {issue.description}
        </p>
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
