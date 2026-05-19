'use client';

import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JobRequisitionApproval } from '@/modules/jobs/types/jobRequisitionTypes';

interface ApprovalHistoryTabProps {
  approvals: JobRequisitionApproval[];
}

function getDecisionClasses(decision: JobRequisitionApproval['decision']) {
  if (decision === 'APPROVED') return 'border-success-border bg-success-bg text-success-text';
  if (decision === 'REJECTED') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  return 'border-warning-border bg-warning-bg text-warning-text';
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export function ApprovalHistoryTab({ approvals }: Readonly<ApprovalHistoryTabProps>) {
  const sortedApprovals = [...approvals].sort((a, b) => {
    const aTime = new Date(a.decidedAt ?? a.createdAt).getTime();
    const bTime = new Date(b.decidedAt ?? b.createdAt).getTime();
    return bTime - aTime;
  });

  if (sortedApprovals.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-neutral-500 shadow-[var(--shadow-1)]">
        No approval activity yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="space-y-5">
        {sortedApprovals.map((approval) => {
          const isApproved = approval.decision === 'APPROVED';
          const isRejected = approval.decision === 'REJECTED';
          const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock;
          return (
            <div key={approval.id} className="relative flex gap-4 pl-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border bg-surface',
                    isApproved && 'border-success-border text-success-text',
                    isRejected && 'border-destructive-border text-destructive-text',
                    !isApproved && !isRejected && 'border-neutral-200 text-warning-text',
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="mt-2 h-full w-px bg-neutral-100" />
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{approval.approverName ?? approval.approverId}</p>
                  <Badge className={cn('border', getDecisionClasses(approval.decision))}>
                    {approval.decision}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatDate(approval.decidedAt ?? approval.createdAt)}
                </p>
                {approval.comment ? (
                  <p className="mt-2 text-sm italic text-neutral-700">
                    &quot;{approval.comment}&quot;
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
