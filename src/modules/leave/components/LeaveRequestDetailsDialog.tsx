'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useApproveLeaveRequest } from '@/modules/leave/hooks/useApproveLeaveRequest';
import { useRejectLeaveRequest } from '@/modules/leave/hooks/useRejectLeaveRequest';
import { useLeaveRequest } from '@/modules/leave/hooks/useLeaveRequest';
import { canApproveLeaves } from '@/modules/leave/utils/leavePermissions';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';
import type { LeavePermissions } from '@/modules/leave/types/leaveTypes';

interface LeaveRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  leaveRequestId: string | null;
  permissions: LeavePermissions;
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-success-bg text-success-text';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'CANCELLED') return 'bg-neutral-50 text-neutral-500';
  return 'bg-warning-bg text-warning-text';
}

export function LeaveRequestDetailsDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  leaveRequestId,
  permissions,
}: Readonly<LeaveRequestDetailsDialogProps>) {
  const { data, isLoading } = useLeaveRequest(orgSlug, memberId, leaveRequestId);
  const approveMutation = useApproveLeaveRequest(orgSlug, memberId);
  const rejectMutation = useRejectLeaveRequest(orgSlug, memberId);
  const [approverComment, setApproverComment] = useState('');

  const canApprove = canApproveLeaves(permissions.approve);

  async function handleApprove() {
    if (!leaveRequestId) return;
    try {
      await approveMutation.mutateAsync({ leaveRequestId, data: { approverComment } });
      toast.success('Leave request approved');
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to approve request'));
    }
  }

  async function handleReject() {
    if (!leaveRequestId) return;
    try {
      await rejectMutation.mutateAsync({ leaveRequestId, data: { approverComment } });
      toast.success('Leave request rejected');
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to reject request'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-surface">
        <DialogHeader>
          <DialogTitle>Leave Request Details</DialogTitle>
          <DialogDescription>Review the request and take action if you have approval access.</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-10 text-sm text-neutral-500">Loading request details...</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-canvas p-4">
              <div>
                <p className="text-lg font-semibold text-neutral-900">{data.leaveType.name}</p>
                <p className="text-sm text-neutral-500">{data.member.name ?? data.member.email ?? data.member.memberId}</p>
              </div>
              <Badge className={statusTone(data.status)}>{data.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-neutral-100 p-3">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Date Range</p>
                <p className="mt-1 text-sm text-neutral-900">{data.startDate} to {data.endDate}</p>
              </div>
              <div className="rounded-lg border border-neutral-100 p-3">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Days</p>
                <p className="mt-1 font-mono text-sm text-neutral-900">{data.days}</p>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-100 p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Reason</p>
              <p className="mt-1 text-sm text-neutral-900">{data.reason || 'No reason provided'}</p>
            </div>

            {canApprove && data.status === 'PENDING' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leave-approver-comment">Approver Comment</Label>
                <Textarea
                  id="leave-approver-comment"
                  rows={4}
                  value={approverComment}
                  onChange={(event) => setApproverComment(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          {canApprove && data?.status === 'PENDING' ? (
            <>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="h-9 rounded-md border border-destructive-border bg-destructive-bg px-4 text-sm font-medium text-destructive-text hover:opacity-90 disabled:opacity-60"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
