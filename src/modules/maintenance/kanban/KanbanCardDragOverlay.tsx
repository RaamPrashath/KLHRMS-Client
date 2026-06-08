'use client';

import { cn } from '@/lib/utils';
import { Clock, MessageSquare, Paperclip } from 'lucide-react';
import type { KanbanIssue } from './kanban.types';

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return '1d ago';
  return `${diff}d ago`;
}

function getActorName(issue: KanbanIssue): string {
  if (issue.status === 'cancelled') {
    return issue.cancelledByName ?? issue.raisedByName ?? 'Unknown';
  }
  return issue.assignees[0]?.name ?? 'Unassigned';
}

export function KanbanCardDragOverlay({ issue }: { issue: KanbanIssue }) {
  const actorName = getActorName(issue);
  const actorInitial = actorName.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div className="w-[284px] rounded-xl border border-border bg-card p-3 shadow-[0_20px_60px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.1)] scale-[1.02] rotate-[1deg]">
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
            {actorInitial}
          </div>
          <span className="truncate text-[11px] text-muted-foreground">
            {issue.status === 'cancelled' ? `Cancelled by ${actorName}` : actorName}
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
    </div>
  );
}
