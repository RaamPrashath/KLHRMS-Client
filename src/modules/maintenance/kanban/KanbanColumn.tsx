'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { KanbanIssue, ColumnConfig } from './kanban.types';

export function KanbanColumn({
  column,
  issues,
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
    <section
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-0 w-[290px] shrink-0 flex-col overflow-hidden px-2 pt-2 border-r border-neutral-200/70 last:border-r-0',
        isOver && 'bg-[#f5f9ff] ring-2 ring-inset ring-primary/20',
      )}
    >
      <header className="sticky top-0 z-10 mb-3">
        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <span className={cn('size-2.5 rounded-full shrink-0', column.dot)} />
          <span className={cn('text-sm font-semibold uppercase tracking-[0.01em] truncate text-slate-800', column.text)}>
            {column.title}
          </span>
          <span className="ml-auto flex h-6 min-w-7 items-center justify-center rounded-full bg-[#f1f3f7] px-2 text-[11px] font-semibold text-[#475569]">
            {issues.length}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col gap-3">
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
    </section>
  );
}
