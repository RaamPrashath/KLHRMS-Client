'use client';

import {
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  JobRequisitionApproval,
  JobRequisitionRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';

interface JobRequisitionTableProps {
  data: JobRequisitionRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  showRaisedBy: boolean;
  onRowClick: (requisitionId: string) => void;
  onNewRequisition: () => void;
}

const SKELETON_IDS = Array.from({ length: 8 }, (_, index) => `requisition-skeleton-${index}`);

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return fallback;
}

function parseError(error: Error | null) {
  return getErrorMessage(error, 'Failed to load job requisitions.');
}

function getStatusClasses(status: JobRequisitionRecord['status'] | JobRequisitionApproval['decision']) {
  if (status === 'APPROVED') return 'border-success-border bg-success-bg text-success-text';
  if (status === 'REJECTED') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
    return 'border-warning-border bg-warning-bg text-warning-text';
  }
  if (status === 'PARTIALLY_APPROVED') return 'border-amber-border bg-amber-bg text-amber-text';
  if (status === 'PUBLISHED') return 'border-sky-border bg-sky-bg text-sky-text';
  if (status === 'ACTIVE_HIRING') return 'border-violet-border bg-violet-bg text-violet-text';
  if (status === 'FILLED') return 'border-emerald-border bg-emerald-bg text-emerald-text';
  if (status === 'CLOSED') return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  if (status === 'ARCHIVED') return 'border-neutral-100 bg-neutral-50 text-neutral-400';
  return 'border-info-border bg-info-bg text-info-text';
}

function getPriorityClasses(priority: JobRequisitionRecord['priority']) {
  if (priority === 'LOW') return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  if (priority === 'HIGH') return 'border-warning-border bg-warning-bg text-warning-text';
  if (priority === 'CRITICAL') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  return 'border-info-border bg-info-bg text-info-text';
}

function ApprovalAvatarStack({
  approvals,
  summary,
}: Readonly<{
  approvals: JobRequisitionApproval[];
  summary: JobRequisitionRecord['approvalSummary'];
}>) {
  if (approvals.length === 0) {
    return <span className="text-xs text-neutral-400">No approvers</span>;
  }

  return (
    <div className="flex items-center justify-center gap-2" title={`${summary.approvedCount}/${summary.totalCount} approved`}>
      <div className="flex -space-x-2">
        {approvals.slice(0, 4).map((approval) => (
          <span
            key={approval.id}
            className={cn(
              'flex size-7 items-center justify-center rounded-full border-2 border-surface text-[11px] font-medium',
              approval.decision === 'APPROVED' && 'bg-success-bg text-success-text',
              approval.decision === 'REJECTED' && 'bg-destructive-bg text-destructive-text',
              approval.decision === 'PENDING' && 'bg-warning-bg text-warning-text',
            )}
            title={`${approval.approverName ?? approval.approverId}: ${approval.decision}`}
          >
            {(approval.approverName ?? approval.approverId).charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="font-mono text-xs text-neutral-500">
        {summary.approvedCount}/{summary.totalCount}
      </span>
    </div>
  );
}

export function JobRequisitionTable({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  showRaisedBy,
  onRowClick,
  onNewRequisition,
}: Readonly<JobRequisitionTableProps>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const filteredData = globalFilter
    ? data.filter((record) => {
        const value = globalFilter.toLowerCase();
        return (
          record.title.toLowerCase().includes(value) ||
          (record.departmentName ?? '').toLowerCase().includes(value) ||
          (record.raisedByName ?? '').toLowerCase().includes(value) ||
          (record.requisitionLabel ?? '').toLowerCase().includes(value)
        );
      })
    : data;

  return (
    <>
      <div className="mx-4 mb-7 flex flex-1 flex-col sm:mx-6 lg:mx-7">
        <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search requisitions..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="border-0 bg-canvas pl-9 text-sm focus:bg-surface focus:border-primary focus:ring-[3px] focus:ring-primary/10"
              />
              {globalFilter ? (
                <button
                  type="button"
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-700"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <Button type="button" onClick={onNewRequisition} className="shrink-0">
              <Plus className="size-4" />
              New Requisition
            </Button>
          </div>

          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-sm font-medium text-neutral-900">Failed to load job requisitions</p>
              <p className="max-w-sm text-center text-xs text-neutral-500">{parseError(error)}</p>
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry Connection
              </Button>
            </div>
          ) : null}

          {!isError ? (
            <div className="overflow-x-auto">
              <div
                className={cn(
                  'grid min-w-[650px] items-center border-b border-neutral-100 bg-canvas/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500',
                  showRaisedBy
                    ? 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'
                    : 'grid-cols-[2fr_1fr_1fr_1fr_1fr]',
                )}
              >
                <div className="text-left">Requisition</div>
                <div className="text-center">Priority</div>
                <div className="text-center">Positions</div>
                <div className="text-center">Approval</div>
                <div className="text-center">Status</div>
                {showRaisedBy ? <div className="text-center">Raised By</div> : null}
              </div>

              {isLoading ? (
                <div className="divide-y divide-neutral-100">
                  {SKELETON_IDS.map((id) => (
                    <div key={id} className="px-4 py-4">
                      <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
                    </div>
                  ))}
                </div>
              ) : null}

              {!isLoading && filteredData.length === 0 ? (
                <div className="py-16 text-center text-sm text-neutral-500">
                  {globalFilter ? 'No requisitions match your search.' : 'No requisitions found.'}
                </div>
              ) : null}

              {!isLoading && filteredData.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {filteredData.map((record) => (
                    <div
                      key={record.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onRowClick(record.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onRowClick(record.id);
                      }}
                      className={cn(
                        'grid cursor-pointer items-center px-4 py-3 transition-colors hover:bg-canvas',
                        showRaisedBy
                          ? 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'
                          : 'grid-cols-[2fr_1fr_1fr_1fr_1fr]',
                      )}
                    >
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium text-neutral-900">{record.title}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {record.departmentName ?? 'No department'} &bull; {formatLabel(record.employmentType)}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <Badge className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', getPriorityClasses(record.priority))}>
                          {formatLabel(record.priority)}
                        </Badge>
                      </div>
                      <div className="text-center font-mono text-sm text-neutral-900">{record.openings}</div>
                      <div className="flex justify-center">
                        <ApprovalAvatarStack approvals={record.approvals} summary={record.approvalSummary} />
                      </div>
                      <div className="flex justify-center">
                        <Badge className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', getStatusClasses(record.status))}>
                          {formatLabel(record.status)}
                        </Badge>
                      </div>
                      {showRaisedBy ? (
                        <div className="truncate text-center text-sm text-neutral-700">
                          {record.raisedByName ?? 'Unknown'}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}
