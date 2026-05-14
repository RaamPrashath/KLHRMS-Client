'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileClock,
  Hammer,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError, conditionBadge, formatDate } from '@/modules/assets/lib/assetUtils';
import {
  assetConditionOptions,
  assetMaintenanceTypeOptions,
  type AssetMaintenanceCreateInput,
  type AssetMaintenanceUpdateInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCondition,
  AssetDetail,
  AssetMaintenanceSummary,
  AssetSummary,
} from '@/modules/assets/types/assetTypes';

type ColumnId = 'open' | 'in_progress' | 'completed' | 'cancelled';

interface ColumnDef {
  id: ColumnId;
  label: string;
  color: string;
  bg: string;
  dot: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'open', label: 'Reported', color: 'text-[#b3261e]', bg: 'bg-[#fff3f2]', dot: 'bg-[#b3261e]' },
  { id: 'in_progress', label: 'In Progress', color: 'text-[#8a5a00]', bg: 'bg-[#fff7e8]', dot: 'bg-[#e8a817]' },
  { id: 'completed', label: 'Completed', color: 'text-[#156f3d]', bg: 'bg-[#eef9f1]', dot: 'bg-[#00874a]' },
  { id: 'cancelled', label: 'Cancelled', color: 'text-[#5b6470]', bg: 'bg-[#f3f4f6]', dot: 'bg-[#9ca3af]' },
];

const MAINTENANCE_TYPE_ICONS: Record<string, typeof Wrench> = {
  REPAIR: Wrench,
  SERVICE: Hammer,
  INSPECTION: Search,
  REPLACEMENT: ArrowRight,
  UPGRADE: ChevronRight,
  WARRANTY_CLAIM: FileClock,
  DAMAGE_CHECK: AlertTriangle,
};

const MAINTENANCE_TYPE_COLORS: Record<string, string> = {
  REPAIR: 'bg-[#fff3f2] text-[#b3261e]',
  SERVICE: 'bg-[#eef5ff] text-[#2454a6]',
  INSPECTION: 'bg-[#f0f4f8] text-[#5b6470]',
  REPLACEMENT: 'bg-[#fff7e8] text-[#8a5a00]',
  UPGRADE: 'bg-[#f3fbf5] text-[#156f3d]',
  WARRANTY_CLAIM: 'bg-[#fef3e2] text-[#8a5a00]',
  DAMAGE_CHECK: 'bg-[#fff1f1] text-[#b3261e]',
};

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Draggable Card ─────────────────────────────────────────────────

function KanbanCard({
  asset,
  maintenanceRecord,
  columnId,
  onOpen,
  onComplete,
  onCancel,
  onEdit,
  onMoveStatus,
  canManageAssets,
}: {
  asset: AssetSummary;
  maintenanceRecord: AssetMaintenanceSummary | null;
  columnId: ColumnId;
  onOpen: (assetId: string) => void;
  onComplete: (log: AssetMaintenanceSummary) => void;
  onCancel: (log: AssetMaintenanceSummary) => void;
  onEdit: (log: AssetMaintenanceSummary) => void;
  onMoveStatus: (assetId: string, newStatus: string) => void;
  canManageAssets: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.id,
    data: { asset, maintenanceRecord, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const record = maintenanceRecord;
  const type = record?.maintenanceType || 'REPAIR';
  const TypeIcon = MAINTENANCE_TYPE_ICONS[type] || Wrench;
  const days = record ? daysSince(record.serviceDate) : 0;
  const isUrgent = days > 7 && columnId === 'open';
  const isTerminal = columnId === 'completed' || columnId === 'cancelled';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-2xl border-2 bg-white text-left transition-shadow',
        isDragging ? 'z-50 shadow-xl opacity-90' : 'shadow-sm hover:shadow-md',
        columnId === 'open' && 'border-[#e8d5d5]',
        columnId === 'in_progress' && 'border-[#e8ddc5]',
        columnId === 'completed' && 'border-[#d0e0d0]',
        columnId === 'cancelled' && 'border-[#e0e0e0]',
      )}
    >
      {/* Card body */}
      <div className="p-3.5 cursor-pointer" onClick={() => { if (!isTerminal) onOpen(asset.id); }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', MAINTENANCE_TYPE_COLORS[type] || 'bg-[#f0f4f8] text-[#6b7280]')}>
              <TypeIcon className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#111827] truncate leading-tight">{asset.name}</p>
              <p className="text-[11px] text-[#6b7280] truncate">{asset.assetCode}</p>
            </div>
          </div>
          <Badge className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]',
            conditionBadge(asset.condition),
          )}>
            {humanize(asset.condition)}
          </Badge>
        </div>

        {record && (
          <p className="mt-2 text-[12px] leading-4 text-[#374151] line-clamp-2">{record.issueDescription}</p>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', MAINTENANCE_TYPE_COLORS[type] || 'bg-[#f0f4f8] text-[#6b7280]')}>
              {humanize(type)}
            </Badge>
            {days > 0 && (
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-medium',
                isUrgent ? 'text-[#b3261e]' : 'text-[#6b7280]',
              )}>
                <Clock className="size-3" />
                {days}d
              </span>
            )}
          </div>
          {isTerminal && record && (
            <span className="text-[10px] text-[#6b7280]">
              {formatDate(record.completedDate || record.serviceDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────

function KanbanColumn({
  column,
  assets,
  maintenanceMap,
  onOpen,
  onComplete,
  onCancel,
  onEdit,
  onMoveStatus,
  canManageAssets,
}: {
  column: ColumnDef;
  assets: AssetSummary[];
  maintenanceMap: Map<string, AssetMaintenanceSummary>;
  onOpen: (assetId: string) => void;
  onComplete: (log: AssetMaintenanceSummary) => void;
  onCancel: (log: AssetMaintenanceSummary) => void;
  onEdit: (log: AssetMaintenanceSummary) => void;
  onMoveStatus: (assetId: string, newStatus: string) => void;
  canManageAssets: boolean;
}) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id });

  return (
    <div ref={setDroppableRef} className="flex flex-col rounded-[18px] border-2 border-[#e2e5ea] bg-[#f8f9fc]">
      <div className={cn('flex items-center gap-2 border-b-2 border-[#e2e5ea] px-4 py-2.5', column.bg)}>
        <span className={cn('flex size-3 rounded-full shrink-0', column.dot)} />
        <span className={cn('text-[12px] font-semibold uppercase tracking-[0.08em]', column.color)}>
          {column.label}
        </span>
        <span className={cn('ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold', column.bg, column.color)}>
          {assets.length}
        </span>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 max-h-130">
        <SortableContext items={assets.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-white text-[#9ca3af]">
                <FileClock className="size-4" />
              </div>
              <p className="mt-2 text-[12px] text-[#6b7280]">No assets</p>
            </div>
          ) : (
            assets.map((asset) => (
              <KanbanCard
                key={asset.id}
                asset={asset}
                maintenanceRecord={maintenanceMap.get(asset.id) || null}
                columnId={column.id}
                onOpen={onOpen}
                onComplete={onComplete}
                onCancel={onCancel}
                onEdit={onEdit}
                onMoveStatus={onMoveStatus}
                canManageAssets={canManageAssets}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Centered Detail Dialog (bottom-right animation) ──────────────

function MaintenanceDetailDialog({
  log,
  asset,
  open,
  onOpenChange,
  onComplete,
  onCancel,
  onEdit,
  onCreateMaintenance,
  canManageAssets,
  allAssets,
}: {
  log: AssetMaintenanceSummary | null;
  asset: AssetSummary | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: (log: AssetMaintenanceSummary) => void;
  onCancel: (log: AssetMaintenanceSummary) => void;
  onEdit: (log: AssetMaintenanceSummary) => void;
  onCreateMaintenance: (data: AssetMaintenanceCreateInput) => Promise<void>;
  canManageAssets: boolean;
  allAssets: AssetSummary[];
}) {
  const [createType, setCreateType] = useState<string>('REPAIR');
  const [createDesc, setCreateDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateRecord() {
    if (!asset || !createDesc.trim()) return;
    setIsCreating(true);
    try {
      await onCreateMaintenance({
        assetId: asset.id,
        maintenanceType: createType as AssetMaintenanceCreateInput['maintenanceType'],
        issueDescription: createDesc.trim(),
        serviceDate: new Date().toISOString().split('T')[0],
        expectedCompletionDate: '',
        cost: null,
        status: 'OPEN',
        conditionBeforeMaintenance: asset.condition,
        notes: '',
      });
      setCreateType('REPAIR');
      setCreateDesc('');
      onOpenChange(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to create record'));
    } finally {
      setIsCreating(false);
    }
  }

  if (!open || !asset) return null;

  const activeLog = log;
  const hasRecord = !!activeLog;
  const TypeIcon = activeLog ? (MAINTENANCE_TYPE_ICONS[activeLog.maintenanceType] || Wrench) : Wrench;
  const days = activeLog ? daysSince(activeLog.serviceDate) : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: '40vw', y: '40vh', scale: 0.8 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: '40vw', y: '40vh', scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.85 }}
              className="pointer-events-auto w-125 max-h-[85vh] overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', hasRecord ? (MAINTENANCE_TYPE_COLORS[activeLog!.maintenanceType] || 'bg-[#f0f4f8] text-[#6b7280]') : 'bg-[#f0f4f8] text-[#6b7280]')}>
                    <TypeIcon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">{asset.name}</h2>
                      {hasRecord && (
                        <Badge className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                          activeLog!.status === 'OPEN' ? 'bg-[#fff3f2] text-[#b3261e]' :
                          activeLog!.status === 'IN_PROGRESS' ? 'bg-[#fff7e8] text-[#8a5a00]' :
                          'bg-[#eef9f1] text-[#156f3d]',
                        )}>
                          {humanize(activeLog!.status)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[14px] text-[#6b7280]">{asset.assetCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {hasRecord ? (
                <>
                  {/* Body with record details */}
                  <div className="overflow-y-auto px-6 py-5 space-y-5">
                    <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-4">
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-[#f0f4f8] text-[#6b7280]">
                            <FileClock className="size-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">Raised by</p>
                            <p className="text-[14px] font-medium text-[#111827]">{activeLog!.loggedByName || 'System'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">Issue</p>
                      <p className="text-[14px] leading-6 text-[#374151]">{activeLog!.issueDescription}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Type</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <TypeIcon className="size-3.5 text-[#6b7280]" />
                          <span className="text-[14px] font-medium text-[#111827]">{humanize(activeLog!.maintenanceType)}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Service Date</p>
                        <p className="mt-1.5 text-[14px] font-medium text-[#111827]">{formatDate(activeLog!.serviceDate)}</p>
                      </div>
                      {activeLog!.expectedCompletionDate && (
                        <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Expected Completion</p>
                          <p className="mt-1.5 text-[14px] font-medium text-[#111827]">{formatDate(activeLog!.expectedCompletionDate)}</p>
                        </div>
                      )}
                      <div className={cn('rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5', !activeLog!.expectedCompletionDate && 'col-span-2')}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Days Open</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Clock className={cn('size-3.5', days > 7 ? 'text-[#b3261e]' : 'text-[#6b7280]')} />
                          <span className={cn('text-[14px] font-medium', days > 7 ? 'text-[#b3261e]' : 'text-[#111827]')}>{days} day{days !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {activeLog!.cost != null && (
                        <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Cost</p>
                          <p className="mt-1.5 text-[14px] font-medium text-[#111827]">${activeLog!.cost}</p>
                        </div>
                      )}
                      {activeLog!.conditionBeforeMaintenance && (
                        <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] p-3.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Condition Before</p>
                          <Badge className={cn('mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium', conditionBadge(activeLog!.conditionBeforeMaintenance))}>
                            {humanize(activeLog!.conditionBeforeMaintenance)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {activeLog!.notes && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">Notes</p>
                        <p className="text-[14px] leading-6 text-[#6b7280] italic">{activeLog!.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#eef0f3] px-6 py-4">
                    <div className="flex gap-2">
                      {activeLog!.status !== 'COMPLETED' && activeLog!.status !== 'CANCELLED' && (
                        <>
                          {canManageAssets && (
                            <Button variant="outline" className="rounded-full px-4 text-[13px]" onClick={() => { onEdit(activeLog!); onOpenChange(false); }}>
                              <Edit3 className="mr-1.5 size-3.5" />
                              Edit
                            </Button>
                          )}
                          <Button variant="outline" className="rounded-full px-4 text-[13px] text-[#b3261e] border-[#e8d5d5] hover:bg-[#fff3f2]" onClick={() => { onCancel(activeLog!); onOpenChange(false); }}>
                            <X className="mr-1.5 size-3.5" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                    {activeLog!.status !== 'COMPLETED' && activeLog!.status !== 'CANCELLED' && (
                      <Button className="rounded-full px-5 text-[13px] text-white shadow-sm" style={{ backgroundColor: ACTION_GREEN }} onClick={() => { onComplete(activeLog!); onOpenChange(false); }}>
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        Complete
                      </Button>
                    )}
                  </div>
                </>
              ) : canManageAssets ? (
                <>
                  {/* Create Record Form */}
                  <div className="px-6 py-5 space-y-5">
                    <div className="rounded-2xl border-2 border-dashed border-[#e2e5ea] bg-[#fbfcfb] p-5 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-[#f0f4f8] text-[#6b7280] mx-auto">
                        <FileClock className="size-5" />
                      </div>
                      <p className="mt-3 text-[15px] font-medium text-[#111827]">No maintenance record</p>
                      <p className="mt-1 text-[13px] text-[#6b7280]">Create a maintenance record for this asset to track repairs and service history.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">Type</p>
                        <Select value={createType} onValueChange={(v) => setCreateType(v)}>
                          <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[#e5e7eb]">
                            {assetMaintenanceTypeOptions.map((t) => (
                              <SelectItem key={t} value={t} className="text-[13px]">{humanize(t)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">Issue Description</p>
                        <Textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} rows={3} placeholder="Describe the issue..."
                          className="rounded-xl border-2 border-[#e2e5ea] px-3 py-2 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-[#eef0f3] px-6 py-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">Cancel</Button>
                    <Button onClick={() => void handleCreateRecord()} disabled={isCreating || !createDesc.trim()}
                      className="rounded-full px-5 text-[13px] text-white" style={{ backgroundColor: '#2454a6' }}>
                      <Plus className="mr-1.5 size-3.5" />
                      {isCreating ? 'Creating...' : 'Create Record'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#f0f4f8] text-[#9ca3af]">
                    <FileClock className="size-5" />
                  </div>
                  <p className="mt-3 text-[15px] font-medium text-[#111827]">No maintenance record</p>
                  <p className="mt-1 text-[13px] text-[#6b7280]">This asset has no maintenance history yet.</p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Quick Log Form ─────────────────────────────────────────────────

function QuickLogForm({
  allAssets,
  onLog,
  isLogging,
  canManageAssets,
}: {
  allAssets: AssetSummary[];
  onLog: (data: AssetMaintenanceCreateInput) => Promise<void>;
  isLogging: boolean;
  canManageAssets: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<string>('REPAIR');
  const [description, setDescription] = useState('');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const filteredAssets = useMemo(
    () => allAssets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.assetCode.toLowerCase().includes(search.toLowerCase())),
    [allAssets, search],
  );

  const selectedAsset = allAssets.find((a) => a.id === selectedAssetId);

  async function handleSubmit() {
    if (!selectedAssetId || !description.trim()) return;
    await onLog({
      assetId: selectedAssetId,
      maintenanceType: maintenanceType as AssetMaintenanceCreateInput['maintenanceType'],
      issueDescription: description.trim(),
      serviceDate: new Date().toISOString().split('T')[0],
      expectedCompletionDate: '',
      cost: null,
      status: 'OPEN',
      conditionBeforeMaintenance: selectedAsset?.condition || 'GOOD',
      notes: '',
    });
    setSelectedAssetId('');
    setDescription('');
    setSearch('');
  }

  return (
    <div className="rounded-[18px] border-2 border-[#e2e5ea] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white', canManageAssets ? 'bg-[#1d1d1f]' : 'bg-[#2454a6]')}>
          <Plus className="size-3" />
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
          {canManageAssets ? 'Quick Log' : 'Raise a Report'}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-50 relative">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Asset</p>
          {selectedAsset ? (
            <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-[#e2e5ea] bg-white px-3">
              <span className="flex-1 text-[13px] font-medium text-[#111827]">{selectedAsset.name}</span>
              <button type="button" onClick={() => { setSelectedAssetId(''); setSearch(''); }} className="text-[#9ca3af] hover:text-[#b3261e]">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af] pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowAssetPicker(true); }}
                onFocus={() => setShowAssetPicker(true)}
                placeholder="Search assets..."
                className="h-10 rounded-xl border-2 border-[#e2e5ea] pl-9 pr-3 text-[13px] shadow-none focus-visible:ring-0 focus-visible:border-[#1d1d1f]"
              />
              {showAssetPicker && search && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border-2 border-[#e2e5ea] bg-white shadow-lg">
                  {filteredAssets.slice(0, 20).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setSelectedAssetId(a.id); setSearch(a.name); setShowAssetPicker(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-[#111827] hover:bg-[#f8f9fa]"
                    >
                      <span className="font-medium">{a.name}</span>
                      <span className="text-[#6b7280]">· {a.assetCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-36">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Type</p>
          <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v)}>
            <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-2.5 text-[13px] text-[#111827] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#e5e7eb]">
              {assetMaintenanceTypeOptions.map((t) => (
                <SelectItem key={t} value={t} className="text-[13px]">{humanize(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-2 min-w-50">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Issue</p>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
            placeholder="Describe the issue..."
            className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0 focus-visible:border-[#1d1d1f] placeholder:text-[#9ca3af]"
          />
        </div>

        <Button
          onClick={() => void handleSubmit()}
          disabled={isLogging || !selectedAssetId || !description.trim()}
          className="h-10 shrink-0 rounded-xl px-5 text-[13px] font-medium text-white"
          style={{ backgroundColor: canManageAssets ? ACTION_GREEN : '#2454a6' }}
        >
          <Plus className="mr-1.5 size-3.5" />
          {isLogging ? 'Logging...' : canManageAssets ? 'Log' : 'Raise Report'}
        </Button>
      </div>
    </div>
  );
}

// ── Completion Dialog ──────────────────────────────────────────────

function CompleteMaintenanceDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: { completedDate: string; cost: number | null; conditionAfterMaintenance: string; notes: string }) => void;
  isSaving: boolean;
}) {
  const [completedDate, setCompletedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-100 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-5 py-4">
          <h2 className="text-[18px] font-semibold text-[#111827]">Complete Maintenance</h2>
          <button type="button" onClick={() => onOpenChange(false)} className="flex size-8 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#f3f4f6]">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Completion Date</p>
            <Input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)}
              className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0" />
          </div>
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Cost ($)</p>
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0"
              className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0" />
          </div>
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Condition After</p>
            <Select value={condition} onValueChange={(v) => setCondition(v)}>
              <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#e5e7eb]">
                {assetConditionOptions.map((o) => (
                  <SelectItem key={o} value={o} className="text-[13px]">{humanize(o)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Notes</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Completion notes..."
              className="rounded-xl border-2 border-[#e2e5ea] px-3 py-2 text-[13px] shadow-none focus-visible:ring-0 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eef0f3] px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">Cancel</Button>
          <Button onClick={() => onSave({ completedDate, cost: cost ? Number(cost) : null, conditionAfterMaintenance: condition, notes })}
            disabled={isSaving} className="rounded-full px-5 text-[13px] text-white" style={{ backgroundColor: ACTION_GREEN }}>
            {isSaving ? 'Saving...' : 'Complete'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Edit Maintenance Dialog (admin only) ────────────────────────────

function EditMaintenanceDialog({
  log,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  log: AssetMaintenanceSummary | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: AssetMaintenanceUpdateInput) => Promise<void>;
  isSaving: boolean;
}) {
  const [type, setType] = useState<string>(log?.maintenanceType || 'REPAIR');
  const [description, setDescription] = useState(log?.issueDescription || '');
  const [serviceDate, setServiceDate] = useState(log?.serviceDate || '');
  const [expectedDate, setExpectedDate] = useState(log?.expectedCompletionDate || '');
  const [cost, setCost] = useState(log?.cost != null ? String(log.cost) : '');
  const [condition, setCondition] = useState<string>(log?.conditionBeforeMaintenance || 'GOOD');
  const [notes, setNotes] = useState(log?.notes || '');
  const [status, setStatus] = useState<string>(log?.status || 'OPEN');

  const savedLog = log;
  if (!open || !savedLog) return null;

  const activeLogNonNull = savedLog!;

  async function handleSave() {
    await onSave({
      maintenanceId: activeLogNonNull.id,
      status: status as AssetMaintenanceUpdateInput['status'],
      expectedCompletionDate: expectedDate || undefined,
      notes: notes || undefined,
      completedDate: activeLogNonNull.completedDate || undefined,
      conditionAfterMaintenance: activeLogNonNull.conditionAfterMaintenance || undefined,
      nextAssetStatus: null,
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={() => onOpenChange(false)} />

      <div className="fixed left-1/2 top-1/2 z-50 w-120 max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#eef0f3] bg-white px-5 py-4">
          <h2 className="text-[18px] font-semibold text-[#111827]">Edit Maintenance</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full text-[#9ca3af] hover:bg-[#f3f4f6]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Status</p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#e5e7eb]">
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Type</p>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#e5e7eb]">
                {assetMaintenanceTypeOptions.map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">
                    {humanize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Issue Description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none rounded-xl border-2 border-[#e2e5ea] px-3 py-2 text-[13px] shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <p className="text-[12px] font-medium text-[#6b7280]">Service Date</p>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="grid gap-1.5">
              <p className="text-[12px] font-medium text-[#6b7280]">Expected Completion</p>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <p className="text-[12px] font-medium text-[#6b7280]">Cost ($)</p>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="grid gap-1.5">
              <p className="text-[12px] font-medium text-[#6b7280]">Condition Before</p>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="h-10 rounded-xl border-2 border-[#e2e5ea] px-3 text-[13px] shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#e5e7eb]">
                  {assetConditionOptions.map((o) => (
                    <SelectItem key={o} value={o} className="text-[13px]">
                      {humanize(o)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <p className="text-[12px] font-medium text-[#6b7280]">Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none rounded-xl border-2 border-[#e2e5ea] px-3 py-2 text-[13px] shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#eef0f3] px-5 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-5 text-[13px]"
          >
            Cancel
          </Button>

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || !description.trim()}
            className="rounded-full px-5 text-[13px] text-white"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Cancel Confirm Dialog ──────────────────────────────────────────

function CancelConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isSaving: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-95 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-2xl">
        <h2 className="text-[18px] font-semibold text-[#111827]">Cancel Maintenance?</h2>
        <p className="mt-2 text-[14px] text-[#6b7280]">This will mark the maintenance record as cancelled. This action cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">Keep</Button>
          <Button onClick={() => void onConfirm()} disabled={isSaving}
            className="rounded-full px-5 text-[13px] text-white bg-[#b3261e] hover:bg-[#8a1a15]">
            {isSaving ? 'Cancelling...' : 'Cancel Maintenance'}
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main Export ────────────────────────────────────────────────────

export function MaintenanceKanbanBoard({
  maintenanceAssets,
  allAssets,
  detail,
  onOpenAssetDetail,
  onCreateMaintenance,
  onUpdateMaintenance,
  canManageAssets,
}: {
  maintenanceAssets: AssetSummary[];
  allAssets: AssetSummary[];
  detail: AssetDetail | null;
  onOpenAssetDetail: (assetId: string) => void;
  onCreateMaintenance: (data: AssetMaintenanceCreateInput) => Promise<AssetDetail>;
  onUpdateMaintenance: (params: { assetId: string; data: AssetMaintenanceUpdateInput }) => Promise<AssetDetail>;
  canManageAssets: boolean;
}) {
  const [isLogging, setIsLogging] = useState(false);
  const [slideOverAssetId, setSlideOverAssetId] = useState<string | null>(null);
  const [completingLog, setCompletingLog] = useState<AssetMaintenanceSummary | null>(null);
  const [cancellingLog, setCancellingLog] = useState<AssetMaintenanceSummary | null>(null);
  const [editingLog, setEditingLog] = useState<AssetMaintenanceSummary | null>(null);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailDialogLog, setDetailDialogLog] = useState<AssetMaintenanceSummary | null>(null);
  const [detailDialogAssetId, setDetailDialogAssetId] = useState<string | null>(null);

  // Map maintenance status to column for each asset
  // We derive status from the detail data or default to 'open'
  const assetColumnMap = useMemo(() => {
    const map = new Map<string, ColumnId>();
    if (detail) {
      const activeLog = detail.maintenanceHistory.find(
        (r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED' || r.status === 'CANCELLED',
      );
      if (activeLog) {
        const columnMap: Record<string, ColumnId> = {
          OPEN: 'open',
          IN_PROGRESS: 'in_progress',
          COMPLETED: 'completed',
          CANCELLED: 'cancelled',
        };
        map.set(detail.id, columnMap[activeLog.status] || 'open');
      }
    }
    return map;
  }, [detail]);

  // Map asset ID to its latest maintenance record (from detail)
  const maintenanceMap = useMemo(() => {
    const map = new Map<string, AssetMaintenanceSummary>();
    if (detail) {
      const active = detail.maintenanceHistory.find((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
      if (active) map.set(detail.id, active);
      else if (detail.maintenanceHistory.length > 0) {
        const latest = detail.maintenanceHistory[detail.maintenanceHistory.length - 1];
        map.set(detail.id, latest);
      }
    }
    return map;
  }, [detail]);

  const columnAssets = useMemo(() => {
    const grouped: Record<ColumnId, AssetSummary[]> = {
      open: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    for (const asset of maintenanceAssets) {
      const col = assetColumnMap.get(asset.id) || 'open';
      grouped[col].push(asset);
    }

    return grouped;
  }, [maintenanceAssets, assetColumnMap]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [draggedAsset, setDraggedAsset] = useState<AssetSummary | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { asset?: AssetSummary } | undefined;
    setDraggedAsset(data?.asset || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggedAsset(null);
    const { active, over } = event;
    if (!over || !active) return;

    const activeData = active.data.current as { asset?: AssetSummary; maintenanceRecord?: AssetMaintenanceSummary | null; columnId?: ColumnId } | undefined;
    const overCol = over.id as ColumnId;

    if (!activeData?.asset || activeData.columnId === overCol) return;
    if (overCol === 'completed' || overCol === 'cancelled') return;
    if (!activeData.maintenanceRecord) {
      toast.error('Maintenance record not loaded yet. Click the card to open details.');
      return;
    }

    try {
      await onUpdateMaintenance({
        assetId: activeData.asset.id,
        data: {
          maintenanceId: activeData.maintenanceRecord.id,
          status: overCol === 'in_progress' ? 'IN_PROGRESS' : 'OPEN',
          completedDate: '',
          conditionAfterMaintenance: 'GOOD',
          nextAssetStatus: null,
          notes: '',
        },
      });
      toast.success(`Moved to ${COLUMNS.find((c) => c.id === overCol)?.label}`);
    } catch (error) {
      toast.error(readError(error, 'Failed to update status'));
    }
  }

  function getActiveAssetId() {
    return detailDialogAssetId || slideOverAssetId;
  }

  async function handleQuickLog(data: AssetMaintenanceCreateInput) {
    setIsLogging(true);
    try {
      await onCreateMaintenance(data);
      toast.success('Maintenance logged');
    } catch (error) {
      toast.error(readError(error, 'Failed to log maintenance'));
    } finally {
      setIsLogging(false);
    }
  }

  async function handleComplete(log: AssetMaintenanceSummary) {
    setCompletingLog(log);
  }

  async function handleCompleteSave(data: { completedDate: string; cost: number | null; conditionAfterMaintenance: string; notes: string }) {
    const assetId = getActiveAssetId();
    if (!completingLog || !assetId) return;
    setCompleting(true);
    try {
      await onUpdateMaintenance({
        assetId,
        data: {
          maintenanceId: completingLog.id,
          status: 'COMPLETED',
          completedDate: data.completedDate,
          conditionAfterMaintenance: data.conditionAfterMaintenance as AssetCondition,
          nextAssetStatus: 'AVAILABLE',
          notes: data.notes,
        },
      });
      setCompletingLog(null);
      setSlideOverAssetId(null);
      toast.success('Maintenance completed');
    } catch (error) {
      toast.error(readError(error, 'Failed to complete maintenance'));
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel(log: AssetMaintenanceSummary) {
    setCancellingLog(log);
  }

  async function handleCancelConfirm() {
    const assetId = getActiveAssetId();
    if (!cancellingLog || !assetId) return;
    setCancelling(true);
    try {
      await onUpdateMaintenance({
        assetId,
        data: {
          maintenanceId: cancellingLog.id,
          status: 'CANCELLED',
          completedDate: '',
          conditionAfterMaintenance: null,
          nextAssetStatus: 'AVAILABLE',
          notes: '',
        },
      });
      setCancellingLog(null);
      setSlideOverAssetId(null);
      toast.success('Maintenance cancelled');
    } catch (error) {
      toast.error(readError(error, 'Failed to cancel maintenance'));
    } finally {
      setCancelling(false);
    }
  }

  function handleEdit(log: AssetMaintenanceSummary) {
    setEditingLog(log);
  }

  async function handleEditSave(data: AssetMaintenanceUpdateInput) {
    const assetId = getActiveAssetId();
    if (!assetId) return;
    setEditing(true);
    try {
      await onUpdateMaintenance({
        assetId,
        data,
      });
      setEditingLog(null);
      toast.success('Maintenance updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update maintenance'));
    } finally {
      setEditing(false);
    }
  }

  const detailDialogAsset = detailDialogAssetId
    ? allAssets.find((a) => a.id === detailDialogAssetId) || maintenanceAssets.find((a) => a.id === detailDialogAssetId) || null
    : null;

  async function handleMoveStatus(assetId: string, newStatus: string) {
    try {
      await onUpdateMaintenance({
        assetId,
        data: {
          maintenanceId: '',
          status: newStatus as AssetMaintenanceUpdateInput['status'],
          completedDate: '',
          conditionAfterMaintenance: 'GOOD',
          nextAssetStatus: null,
          notes: '',
        },
      });
      toast.success(`Moved to ${humanize(newStatus)}`);
    } catch (error) {
      toast.error(readError(error, 'Failed to update status'));
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick Log Bar */}
      <QuickLogForm allAssets={allAssets} onLog={handleQuickLog} isLogging={isLogging} canManageAssets={canManageAssets} />

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              assets={columnAssets[col.id]}
              maintenanceMap={maintenanceMap}
              onOpen={(assetId) => {
                onOpenAssetDetail(assetId);
                setDetailDialogAssetId(assetId);
                const record = maintenanceMap.get(assetId) || null;
                setDetailDialogLog(record);
              }}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onEdit={handleEdit}
              onMoveStatus={handleMoveStatus}
              canManageAssets={canManageAssets}
            />
          ))}
        </div>
        <DragOverlay>
          {draggedAsset && (
            <div className="rounded-2xl border-2 border-[#1d1d1f] bg-white p-3.5 shadow-xl w-64">
              <p className="text-[13px] font-semibold text-[#111827]">{draggedAsset.name}</p>
              <p className="text-[11px] text-[#6b7280]">{draggedAsset.assetCode}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Detail Dialog (centered, bottom-right animation) */}
      <MaintenanceDetailDialog
        log={detailDialogLog}
        asset={detailDialogAsset}
        open={!!detailDialogAssetId}
        onOpenChange={(v) => { if (!v) { setDetailDialogLog(null); setDetailDialogAssetId(null); } }}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onEdit={handleEdit}
        onCreateMaintenance={handleQuickLog}
        canManageAssets={canManageAssets}
        allAssets={allAssets}
      />

      {/* Complete Dialog */}
      <CompleteMaintenanceDialog
        open={!!completingLog}
        onOpenChange={(v) => { if (!v) setCompletingLog(null); }}
        onSave={(data) => void handleCompleteSave(data)}
        isSaving={completing}
      />

      {/* Cancel Confirm */}
      <CancelConfirmDialog
        open={!!cancellingLog}
        onOpenChange={(v) => { if (!v) setCancellingLog(null); }}
        onConfirm={() => void handleCancelConfirm()}
        isSaving={cancelling}
      />

      {/* Edit Dialog (admin only) */}
      <EditMaintenanceDialog
        log={editingLog}
        open={!!editingLog}
        onOpenChange={(v) => { if (!v) setEditingLog(null); }}
        onSave={(data) => handleEditSave(data)}
        isSaving={editing}
      />
    </div>
  );
}
