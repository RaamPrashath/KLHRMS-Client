'use client';

import { format } from 'date-fns';
import { Clock, Loader2 } from 'lucide-react';

import { useRequisitionActivityQuery } from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';

interface ActivityTabProps {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'created this requisition',
  SUBMITTED: 'submitted for approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EDITED: 'edited fields',
  CLOSED: 'closed',
  REOPENED: 'reopened',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export function ActivityTab({
  orgSlug,
  memberId,
  requisitionId,
}: Readonly<ActivityTabProps>) {
  const { data = [], isError, isLoading } = useRequisitionActivityQuery(orgSlug, memberId, requisitionId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-neutral-500 shadow-[var(--shadow-1)]">
        <Loader2 className="size-4 animate-spin" />
        Loading activity...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-neutral-500 shadow-[var(--shadow-1)]">
        Failed to load activity.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm text-neutral-500 shadow-[var(--shadow-1)]">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="space-y-4">
        {data.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-neutral-500">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0 flex-1 border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0">
              <p className="text-sm text-neutral-900">
                <span className="font-medium">{entry.actorName ?? 'System'}</span>{' '}
                {ACTION_LABELS[entry.action] ?? entry.action.toLowerCase().replaceAll('_', ' ')}
              </p>
              {entry.comment ? (
                <p className="mt-1 text-sm italic text-neutral-700">
                  &quot;{entry.comment}&quot;
                </p>
              ) : null}
              <p className="mt-1 text-xs text-neutral-500">{format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
