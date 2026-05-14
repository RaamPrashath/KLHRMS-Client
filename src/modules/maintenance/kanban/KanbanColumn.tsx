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
}: {
  column: ColumnConfig;
  issues: KanbanIssue[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        isCollapsed ? 'w-12 flex-none' : 'min-w-0 flex-1 basis-0',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-xl border-b border-border px-3 py-2.5 cursor-pointer select-none',
          column.bg,
        )}
        onClick={onToggleCollapse}
      >
        <span className={cn('size-2 rounded-full', column.dot)} />
        {!isCollapsed && (
          <>
            <span className={cn('text-[12px] font-semibold', column.text)}>{column.title}</span>
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-white/70 text-[10px] font-medium text-muted-foreground">
              {issues.length}
            </span>
          </>
        )}
        {isCollapsed && (
          <span className="flex size-5 items-center justify-center rounded-full bg-white/70 text-[10px] font-medium text-muted-foreground">
            {issues.length}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2',
            isOver && 'ring-2 ring-primary/30 rounded-b-xl',
          )}
        >
          {issues.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
              <p className="text-[12px] text-muted-foreground">No issues</p>
            </div>
          ) : (
            <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map((issue) => (
                <KanbanCard key={issue.id} issue={issue} />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
