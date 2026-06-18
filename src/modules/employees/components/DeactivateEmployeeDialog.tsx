'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { UseMutationResult } from '@tanstack/react-query';

interface DeactivationImpact {
  department_head_count: number;
  pending_leave_count: number;
  project_count: number;
  active_asset_count: number;
}

interface DeactivateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeMemberId: string;
  deactivateMutation: UseMutationResult<
    { member_id: string; name: string; email: string; status: string },
    Error,
    string
  >;
  deactivationImpact?: DeactivationImpact | null;
  isLoadingImpact?: boolean;
}

export function DeactivateEmployeeDialog({
  open,
  onOpenChange,
  employeeName,
  employeeMemberId,
  deactivateMutation,
  deactivationImpact,
  isLoadingImpact,
}: Readonly<DeactivateEmployeeDialogProps>) {
  const handleConfirm = useCallback(() => {
    deactivateMutation.mutate(employeeMemberId, {
      onSuccess: (data) => {
        toast.success(`${data.name} has been deactivated`);
        onOpenChange(false);
      },
      onError: (err) => {
        let message = 'Failed to deactivate employee';
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.message) message = parsed.message;
        } catch {
          if (err.message) message = err.message;
        }
        toast.error(message);
      },
    });
  }, [employeeMemberId, deactivateMutation, onOpenChange]);

  const impactItems: string[] = [];
  if (deactivationImpact) {
    if (deactivationImpact.department_head_count > 0) {
      impactItems.push(`Heads ${deactivationImpact.department_head_count} department${deactivationImpact.department_head_count > 1 ? 's' : ''}`);
    }
    if (deactivationImpact.pending_leave_count > 0) {
      impactItems.push(`Has ${deactivationImpact.pending_leave_count} pending leave request${deactivationImpact.pending_leave_count > 1 ? 's' : ''}`);
    }
    if (deactivationImpact.project_count > 0) {
      impactItems.push(`Assigned to ${deactivationImpact.project_count} project${deactivationImpact.project_count > 1 ? 's' : ''}`);
    }
    if (deactivationImpact.active_asset_count > 0) {
      impactItems.push(`Has ${deactivationImpact.active_asset_count} active asset${deactivationImpact.active_asset_count > 1 ? 's' : ''}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate{' '}
            <span className="font-medium text-foreground">{employeeName}</span>?
          </DialogDescription>
        </DialogHeader>

        {isLoadingImpact ? (
          <p className="text-sm text-neutral-400">Loading downstream impact...</p>
        ) : impactItems.length > 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 space-y-1">
            <p className="font-medium text-neutral-900 text-xs uppercase tracking-wider mb-2">Downstream Impact</p>
            {impactItems.map((item, i) => (
              <p key={i} className="text-neutral-600">{item}</p>
            ))}
          </div>
        ) : deactivationImpact ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500">
            No active downstream dependencies found.
          </div>
        ) : null}

        <div className="text-sm text-neutral-500">
          This will prevent them from logging in and accessing the system. Their
          historical data will be preserved. You can reactivate them later if needed.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deactivateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating…' : 'Confirm Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
