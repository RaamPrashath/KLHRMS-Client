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
}

export function DeactivateEmployeeDialog({
  open,
  onOpenChange,
  employeeName,
  employeeMemberId,
  deactivateMutation,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to deactivate{' '}
            <span className="font-medium text-foreground">{employeeName}</span>?
            <br />
            <br />
            This will prevent them from logging in and accessing the system. Their
            historical data will be preserved. You can reactivate them later if needed.
          </DialogDescription>
        </DialogHeader>

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
