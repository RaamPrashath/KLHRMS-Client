'use client';

import { ArchiveRestore, CheckCircle2, Pencil, Send, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

interface RequisitionHeaderProps {
  requisition: JobRequisitionRecord;
  onSubmit: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
  submitLoading: boolean;
  reopenLoading: boolean;
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getRequisitionStatusClasses(status: JobRequisitionRecord['status']) {
  if (status === 'DRAFT') return 'border-info-border bg-info-bg text-info-text';
  if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
    return 'border-warning-border bg-warning-bg text-warning-text';
  }
  if (status === 'PARTIALLY_APPROVED') return 'border-amber-border bg-amber-bg text-amber-text';
  if (status === 'APPROVED') return 'border-success-border bg-success-bg text-success-text';
  if (status === 'REJECTED') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  if (status === 'PUBLISHED') return 'border-sky-border bg-sky-bg text-sky-text';
  if (status === 'ACTIVE_HIRING') return 'border-violet-border bg-violet-bg text-violet-text';
  if (status === 'FILLED') return 'border-emerald-border bg-emerald-bg text-emerald-text';
  if (status === 'ARCHIVED') return 'border-neutral-100 bg-neutral-50 text-neutral-400';
  return 'border-neutral-200 bg-neutral-100 text-neutral-500';
}

function getPriorityClasses(priority: JobRequisitionRecord['priority']) {
  if (priority === 'LOW') return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  if (priority === 'HIGH') return 'border-warning-border bg-warning-bg text-warning-text';
  if (priority === 'CRITICAL') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  return 'border-info-border bg-info-bg text-info-text';
}

export function RequisitionHeader({
  requisition,
  onSubmit,
  onEdit,
  onApprove,
  onReject,
  onReopen,
  submitLoading,
  reopenLoading,
}: Readonly<RequisitionHeaderProps>) {
  const canShowApprovalActions =
    (requisition.status === 'PENDING_APPROVAL' || requisition.status === 'PARTIALLY_APPROVED') &&
    requisition.currentUserCanApprove;
  const canReopen = requisition.status === 'CLOSED' || requisition.status === 'ARCHIVED';

  return (
    <header className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {requisition.requisitionLabel ? (
              <span className="font-mono text-xs text-neutral-400">{requisition.requisitionLabel}</span>
            ) : null}
            <Badge className={cn('border', getRequisitionStatusClasses(requisition.status))}>
              {formatLabel(requisition.status)}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            {requisition.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-700">
              {requisition.departmentName ?? 'No department'}
            </Badge>
            <Badge className={cn('border', getPriorityClasses(requisition.priority))}>
              {formatLabel(requisition.priority)}
            </Badge>
            <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-700">
              {formatLabel(requisition.employmentType)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {requisition.status === 'DRAFT' ? (
            <>
              <Button type="button" variant="outline" onClick={onEdit}>
                <Pencil className="size-4" />
                Edit
              </Button>
              {requisition.canSubmit ? (
                <Button type="button" onClick={onSubmit} disabled={submitLoading}>
                  <Send className="size-4" />
                  {submitLoading ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              ) : null}
            </>
          ) : null}

          {canShowApprovalActions ? (
            <>
              <Button type="button" variant="destructive" onClick={onReject}>
                <XCircle className="size-4" />
                Reject
              </Button>
              <Button type="button" onClick={onApprove}>
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            </>
          ) : null}

          {canReopen ? (
            <Button type="button" variant="outline" onClick={onReopen} disabled={reopenLoading}>
              <ArchiveRestore className="size-4" />
              {reopenLoading ? 'Reopening...' : 'Reopen'}
            </Button>
          ) : null}

        </div>
      </div>
    </header>
  );
}
