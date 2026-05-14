'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardDragOverlay } from './KanbanCardDragOverlay';
import { readError } from '@/modules/assets/lib/assetUtils';
import type {
  ColumnId,
  KanbanIssue,
} from './kanban.types';
import type { MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

const COLUMNS = [
  { id: 'open' as const, title: 'Open', bg: 'bg-sky-bg', text: 'text-sky-text', dot: 'bg-sky-dot', terminal: false },
  { id: 'in_progress' as const, title: 'In Progress', bg: 'bg-amber-bg', text: 'text-amber-text', dot: 'bg-amber-dot', terminal: false },
  { id: 'done' as const, title: 'Done', bg: 'bg-emerald-bg', text: 'text-emerald-text', dot: 'bg-emerald-dot', terminal: true },
  { id: 'cancelled' as const, title: 'Cancelled', bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-neutral-400', terminal: true },
];

const TICKET_STATUS_TO_COLUMN: Record<string, ColumnId> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'done',
  CANCELLED: 'cancelled',
};

const COLUMN_IDS: ColumnId[] = ['open', 'in_progress', 'done', 'cancelled'];
const COLUMNS_SET = new Set<string>(COLUMN_IDS);

function mapTicketsToIssues(tickets: MaintenanceTicket[]): KanbanIssue[] {
  return tickets.map((t) => ({
    id: t.id,
    assetId: t.assetId,
    title: t.assetName,
    ticketId: t.assetCode,
    description: t.issueDescription,
    priority: 'medium' as const,
    status: TICKET_STATUS_TO_COLUMN[t.status] || 'open',
    assignees: t.loggedByName ? [{ name: t.loggedByName }] : [],
    dueDate: t.serviceDate,
    createdAt: t.createdAt,
    commentCount: 0,
    attachmentCount: 0,
  }));
}

function groupIssues(issues: KanbanIssue[]): Record<ColumnId, KanbanIssue[]> {
  const g: Record<ColumnId, KanbanIssue[]> = {
    open: [], in_progress: [], done: [], cancelled: [],
  };
  for (const issue of issues) {
    g[issue.status].push(issue);
  }
  return g;
}

export function KanbanBoard({
  tickets,
  onUpdateMaintenance,
}: {
  tickets: MaintenanceTicket[];
  onUpdateMaintenance: (params: { assetId: string; data: { maintenanceId: string; status: string } }) => Promise<unknown>;
}) {
  const [activeIssue, setActiveIssue] = useState<KanbanIssue | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [grouped, setGrouped] = useState<Record<ColumnId, KanbanIssue[]> | null>(null);

  const allIssues = useMemo(() => mapTicketsToIssues(tickets), [tickets]);

  useEffect(() => {
    setGrouped(groupIssues(allIssues));
  }, [allIssues]);

  const safeGrouped = grouped ?? groupIssues(allIssues);

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return safeGrouped;
    const q = search.toLowerCase().trim();
    const g: Record<ColumnId, KanbanIssue[]> = {
      open: [], in_progress: [], done: [], cancelled: [],
    };
    for (const col of COLUMN_IDS) {
      g[col] = safeGrouped[col].filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.ticketId.toLowerCase().includes(q) ||
          (i.assignees[0]?.name ?? '').toLowerCase().includes(q),
      );
    }
    return g;
  }, [safeGrouped, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function findColumn(issueId: string): ColumnId | null {
    for (const colId of COLUMN_IDS) {
      if (safeGrouped[colId].some((i) => i.id === issueId)) return colId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const issue = event.active.data.current?.issue as KanbanIssue | undefined;
    if (issue) setActiveIssue(issue);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveIssue(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current?.issue as KanbanIssue | undefined;

    const fromCol = findColumn(activeId);
    let toColId: ColumnId | null = null;
    if (COLUMNS_SET.has(overId)) {
      toColId = overId as unknown as ColumnId;
    } else {
      toColId = findColumn(overId);
    }

    if (!fromCol || !toColId) {
      setActiveIssue(null);
      return;
    }

    setGrouped((prev) => {
      if (!prev) return prev;
      const updated: Record<ColumnId, KanbanIssue[]> = {} as Record<ColumnId, KanbanIssue[]>;
      for (const key of COLUMN_IDS) {
        updated[key] = [...prev[key]];
      }

      const fromItems = updated[fromCol];
      const activeIndex = fromItems.findIndex((i) => i.id === activeId);
      if (activeIndex === -1) return prev;

      if (fromCol === toColId) {
        const toIndex = fromItems.findIndex((i) => i.id === overId);
        if (toIndex >= 0) {
          updated[toColId] = arrayMove(fromItems, activeIndex, toIndex);
        }
      } else {
        const [movedIssue] = fromItems.splice(activeIndex, 1);
        movedIssue.status = toColId;
        updated[fromCol] = fromItems;

        const toItems = updated[toColId];
        const toIndex = toItems.findIndex((i) => i.id === overId);
        if (toIndex >= 0) {
          toItems.splice(toIndex, 0, movedIssue);
        } else {
          toItems.push(movedIssue);
        }
        updated[toColId] = toItems;
      }

      return updated;
    });

    setActiveIssue(null);

    if (fromCol !== toColId && activeData) {
      const targetStatus = Object.entries(TICKET_STATUS_TO_COLUMN).find(([, v]) => v === toColId)?.[0];
      if (targetStatus) {
        const updateData: { maintenanceId: string; status: string; completedDate?: string; nextAssetStatus?: string } = {
          maintenanceId: activeData.id,
          status: targetStatus,
        };
        if (targetStatus === 'COMPLETED') {
          updateData.completedDate = new Date().toISOString().split('T')[0];
          updateData.nextAssetStatus = 'AVAILABLE';
        }
        try {
          await onUpdateMaintenance({
            assetId: activeData.assetId,
            data: updateData,
          });
        } catch (error) {
          toast.error(readError(error, 'Failed to update status'));
        }
      }
    }
  }

  const totalCount = COLUMN_IDS.reduce((sum, col) => sum + safeGrouped[col].length, 0);

  function toggleCollapse(colId: string) {
    setCollapsed((prev) => ({ ...prev, [colId]: !prev[colId] }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 w-full max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground ml-auto">
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => toggleCollapse(col.id)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            >
              <span className={cn('size-1.5 rounded-full', col.dot)} />
              <span>{safeGrouped[col.id].length}</span>
              <span className="hidden sm:inline">{col.title}</span>
            </button>
          ))}
          <span className="text-muted-foreground/60">{totalCount} total</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              issues={filteredGrouped[column.id]}
              isCollapsed={collapsed[column.id]}
              onToggleCollapse={() => toggleCollapse(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && <KanbanCardDragOverlay issue={activeIssue} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
