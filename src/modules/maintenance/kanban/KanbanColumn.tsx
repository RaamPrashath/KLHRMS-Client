'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { KanbanIssue, ColumnConfig } from './kanban.types';

export function KanbanColumn({
  column,
  issues,
  isCollapsed,
  onToggleCollapse,
  onOpenIssue,
}: {
  column: ColumnConfig;
  issues: KanbanIssue[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenIssue: (issue: KanbanIssue) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-[#e8ebf0] bg-[#fbfbfc] last:border-r-0',
        isCollapsed ? 'w-14 flex-none' : 'min-w-0 flex-1 basis-0',
      )}
    >
      <div
        className={cn(
          'flex h-[58px] cursor-pointer select-none items-center gap-2 border-b border-[#edf0f4] px-5',
          column.bg,
        )}
        onClick={onToggleCollapse}
      >
        <span className={cn('size-2.5 rounded-full', column.dot)} />
        {!isCollapsed && (
          <>
            <span className={cn('text-[14px] font-semibold uppercase tracking-[0.01em]', column.text)}>{column.title}</span>
            <span className="ml-auto flex h-7 min-w-8 items-center justify-center rounded-full bg-[#f1f3f7] px-2.5 text-[12px] font-semibold text-[#475569]">
              {issues.length}
            </span>
          </>
        )}
        {isCollapsed && (
          <span className="flex size-7 items-center justify-center rounded-full bg-[#f1f3f7] text-[11px] font-semibold text-[#475569]">
            {issues.length}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4',
            isOver && 'bg-[#f5f9ff] ring-2 ring-inset ring-primary/20',
          )}
        >
          {issues.length === 0 ? (
            <div className="flex flex-1 items-start justify-center pt-16 text-center">
              <p className="text-[14px] font-semibold text-[#c8ced8]">No requests</p>
            </div>
          ) : (
            <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map((issue) => (
                <KanbanCard
                  key={issue.id}
                  issue={issue}
                  onOpenIssue={onOpenIssue}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
