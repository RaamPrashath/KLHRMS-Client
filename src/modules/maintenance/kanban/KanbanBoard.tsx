'use client';

import { useMemo, useState } from 'react';
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
import { toast } from 'sonner';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardDragOverlay } from './KanbanCardDragOverlay';
import { readError } from '@/modules/assets/lib/assetUtils';
import type {
  ColumnId,
  KanbanIssue,
} from './kanban.types';
import type { MaintenanceTicket } from '@/modules/assets/api/assetServerActions';
import type { AssetMaintenanceUpdateInput } from '@/modules/assets/schema/assetSchemas';

export const MAINTENANCE_KANBAN_COLUMNS = [
  { id: 'open' as const, title: 'Open', bg: 'bg-transparent', text: 'text-[#8b94a3]', dot: 'bg-[#2563eb]', terminal: false },
  { id: 'in_progress' as const, title: 'In Progress', bg: 'bg-transparent', text: 'text-[#8b94a3]', dot: 'bg-[#f59e0b]', terminal: false },
  { id: 'done' as const, title: 'Done', bg: 'bg-transparent', text: 'text-[#8b94a3]', dot: 'bg-[#10b981]', terminal: true },
  { id: 'cancelled' as const, title: 'Cancelled', bg: 'bg-transparent', text: 'text-[#8b94a3]', dot: 'bg-[#98a2b3]', terminal: true },
];

export const MAINTENANCE_TICKET_STATUS_TO_COLUMN: Record<string, ColumnId> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'done',
  CANCELLED: 'cancelled',
};

const COLUMN_TO_TICKET_STATUS: Record<ColumnId, AssetMaintenanceUpdateInput['status']> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  done: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const COLUMN_IDS: ColumnId[] = ['open', 'in_progress', 'done', 'cancelled'];
const COLUMNS_SET = new Set<string>(COLUMN_IDS);

function resolvePriority(t: MaintenanceTicket): 'low' | 'medium' | 'high' {
  const desc = (t.issueDescription || '').toLowerCase();
  const cond = (t.assetCondition || '').toUpperCase();
  const type = (t.maintenanceType || '').toLowerCase();
  
  if (
    desc.includes('critical') || 
    desc.includes('failure') || 
    desc.includes('broken') || 
    desc.includes('emergency') ||
    cond === 'POOR' ||
    type.includes('critical')
  ) {
    return 'high';
  }
  if (
    desc.includes('medium') || 
    desc.includes('calibration') || 
    desc.includes('warning') ||
    cond === 'FAIR'
  ) {
    return 'medium';
  }
  return 'low';
}

function mapTicketsToIssues(tickets: MaintenanceTicket[]): KanbanIssue[] {
  return tickets.map((t) => ({
    id: t.id,
    assetId: t.assetId,
    title: t.assetName,
    ticketId: t.ticketId,
    description: t.issueDescription,
    priority: resolvePriority(t),
    status: MAINTENANCE_TICKET_STATUS_TO_COLUMN[t.status] || 'open',
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
  search,
  collapsed,
  onToggleColumn,
  onUpdateMaintenance,
}: {
  tickets: MaintenanceTicket[];
  search: string;
  collapsed: Record<string, boolean>;
  onToggleColumn: (columnId: ColumnId) => void;
  onUpdateMaintenance: (params: { assetId: string | null; data: AssetMaintenanceUpdateInput }) => Promise<unknown>;
}) {
  const [activeIssue, setActiveIssue] = useState<KanbanIssue | null>(null);
  const [grouped, setGrouped] = useState<Record<ColumnId, KanbanIssue[]> | null>(null);
  const [groupedVersion, setGroupedVersion] = useState<string | null>(null);

  const allIssues = useMemo(() => mapTicketsToIssues(tickets), [tickets]);
  const ticketVersion = useMemo(
    () => allIssues.map((issue) => `${issue.id}:${issue.status}:${issue.createdAt}`).join('|'),
    [allIssues],
  );
  const baseGrouped = useMemo(() => groupIssues(allIssues), [allIssues]);
  const safeGrouped = grouped && groupedVersion === ticketVersion ? grouped : baseGrouped;

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return safeGrouped;
    const q = search.toLowerCase().trim();
    const g: Record<ColumnId, KanbanIssue[]> = {
      open: [], in_progress: [], done: [], cancelled: [],
    };
    for (const col of COLUMN_IDS) {
      g[col] = safeGrouped[col].filter(
        (i) =>
          (i.title ?? '').toLowerCase().includes(q) ||
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
      const current = prev && groupedVersion === ticketVersion ? prev : safeGrouped;
      const updated: Record<ColumnId, KanbanIssue[]> = {} as Record<ColumnId, KanbanIssue[]>;
      for (const key of COLUMN_IDS) {
        updated[key] = [...current[key]];
      }

      const fromItems = updated[fromCol];
      const activeIndex = fromItems.findIndex((i) => i.id === activeId);
      if (activeIndex === -1) return current;

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
    setGroupedVersion(ticketVersion);

    setActiveIssue(null);

    if (fromCol !== toColId && activeData) {
      const targetStatus = COLUMN_TO_TICKET_STATUS[toColId];
      if (targetStatus) {
        const updateData: AssetMaintenanceUpdateInput = {
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

  return (
    <div className="h-full min-h-0 overflow-hidden bg-transparent">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full min-h-0 items-stretch overflow-hidden">
          {MAINTENANCE_KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              issues={filteredGrouped[column.id]}
              isCollapsed={collapsed[column.id]}
              onToggleCollapse={() => onToggleColumn(column.id)}
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
