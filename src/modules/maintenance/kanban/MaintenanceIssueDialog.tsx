'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { humanize } from '@/modules/assets/lib/assetUtils';
import { MaintenanceUpdateDialog } from '@/modules/assets/components/MaintenanceUpdateDialog';
import type { ColumnId, KanbanIssue } from './kanban.types';
import type { AssetMaintenanceUpdateInput } from '@/modules/assets/schema/assetSchemas';

function formatIssueDate(dateString: string) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-[#eef0f3] bg-[#fbfbfc] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b94a3]">
        {label}
      </p>
      <p className="text-[14px] font-medium text-[#111827]">
        {value && value.trim().length > 0 ? value : '-'}
      </p>
    </div>
  );
}

const STATUS_ACTIONS: Array<{ column: ColumnId; label: string }> = [
  { column: 'in_progress', label: 'In Progress' },
  { column: 'done', label: 'Done' },
  { column: 'cancelled', label: 'Cancelled' },
];

export function MaintenanceIssueDialog({
  issue,
  open,
  onOpenChange,
  onMoveTo,
  isUpdating,
  onCompleteMaintenance,
}: {
  issue: KanbanIssue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveTo: (issue: KanbanIssue, target: ColumnId) => void;
  isUpdating: boolean;
  onCompleteMaintenance?: (issue: KanbanIssue, data: AssetMaintenanceUpdateInput) => void;
}) {
  const [completionForm, setCompletionForm] = useState<AssetMaintenanceUpdateInput | null>(null);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  function handleDoneClick() {
    if (!issue) return;
    const today = new Date().toISOString().split('T')[0];
    setCompletionForm({
      maintenanceId: issue.id,
      status: 'COMPLETED',
      completedDate: today,
      nextAssetStatus: 'AVAILABLE',
      conditionAfterMaintenance: null,
      notes: '',
    });
    setIsCompletionOpen(true);
  }

  async function handleCompleteSave() {
    if (!issue || !completionForm) return;
    const today = new Date().toISOString().split('T')[0];
    const data = {
      ...completionForm,
      completedDate: completionForm.completedDate || today,
      nextAssetStatus: completionForm.nextAssetStatus || 'AVAILABLE',
    };
    setIsCompleting(true);
    try {
      await onCompleteMaintenance?.(issue, data);
      setIsCompletionOpen(false);
      setCompletionForm(null);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[92vw]! max-w-2xl! rounded-[28px] border border-[#e7ebf0] bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
              {issue?.title ?? 'Issue details'}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-[13px] text-[#6b7280]">
              <span>{issue?.ticketId ?? 'No ticket selected'}</span>
              {issue?.status ? <span>| {humanize(issue.status)}</span> : null}
            </DialogDescription>
          </DialogHeader>

          {!issue ? (
            <div className="px-6 py-8 text-[14px] text-[#6b7280]">No issue selected.</div>
          ) : (
            <>
              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Issue Type" value={humanize(issue.maintenanceType)} />
                  <DetailRow label="Raised By" value={issue.raisedByName} />
                  <DetailRow label="Email" value={issue.raisedByEmail} />
                  <DetailRow label="Date" value={formatIssueDate(issue.createdAt)} />
                  <DetailRow label="Asset Status" value={issue.assetLifecycleStatusLabel} />
                </div>

                <div className="rounded-2xl border border-[#eef0f3] bg-[#fbfbfc] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b94a3]">
                    Issue Description
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#111827]">
                    {issue.description?.trim() ? issue.description : 'No description provided.'}
                  </p>
                </div>
              </div>

              <DialogFooter className="items-center justify-between border-t border-[#eef0f3] px-6 py-4 sm:flex-row">
                <p className="text-[13px] font-medium text-[#6b7280]">Move to</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {STATUS_ACTIONS.map((action) => {
                    const isActive = issue.status === action.column;
                    if (action.column === 'done') {
                      return (
                        <Button
                          key={action.column}
                          type="button"
                          variant={isActive ? 'secondary' : 'outline'}
                          className="rounded-full px-4"
                          disabled={isUpdating || isActive}
                          onClick={handleDoneClick}
                        >
                          {action.label}
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={action.column}
                        type="button"
                        variant={isActive ? 'secondary' : 'outline'}
                        className="rounded-full px-4"
                        disabled={isUpdating || isActive}
                        onClick={() => onMoveTo(issue, action.column)}
                      >
                        {isUpdating && !isActive ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MaintenanceUpdateDialog
        open={isCompletionOpen}
        onOpenChange={(open) => {
          setIsCompletionOpen(open);
          if (!open) setCompletionForm(null);
        }}
        form={completionForm}
        setForm={setCompletionForm}
        isSaving={isCompleting}
        onSave={handleCompleteSave}
      />
    </>
  );
}
