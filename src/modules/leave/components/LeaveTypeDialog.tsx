'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { leaveTypeSchema, type LeaveTypeInput } from '@/modules/leave/schema/leaveSchemas';
import { useCreateLeaveType } from '@/modules/leave/hooks/useCreateLeaveType';
import { useUpdateLeaveType } from '@/modules/leave/hooks/useUpdateLeaveType';
import type { LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';

interface LeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  leaveType?: LeaveTypeRecord | null;
}

type LeaveTypeFormValues = z.input<typeof leaveTypeSchema>;

export function LeaveTypeDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  leaveType,
}: Readonly<LeaveTypeDialogProps>) {
  const createMutation = useCreateLeaveType(orgSlug, memberId);
  const updateMutation = useUpdateLeaveType(orgSlug, memberId);
  const mutation = leaveType ? updateMutation : createMutation;

  const form = useForm<LeaveTypeFormValues, unknown, LeaveTypeInput>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: '',
      quota: 0,
      carryForward: false,
      isPaid: true,
      color: '',
    },
  });

  useEffect(() => {
    form.reset({
      name: leaveType?.name ?? '',
      quota: leaveType?.quota ?? 0,
      carryForward: leaveType?.carryForward ?? false,
      isPaid: leaveType?.isPaid ?? true,
      color: leaveType?.color ?? '',
    });
  }, [form, leaveType, open]);

  async function onSubmit(values: LeaveTypeInput) {
    try {
      if (leaveType) {
        await updateMutation.mutateAsync({ leaveTypeId: leaveType.id, data: values });
        toast.success('Leave type updated');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Leave type created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to save leave type'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-surface">
        <DialogHeader>
          <DialogTitle>{leaveType ? 'Edit Leave Type' : 'Create Leave Type'}</DialogTitle>
          <DialogDescription>Configure quotas and policy for a leave category.</DialogDescription>
        </DialogHeader>

        <form id="leave-type-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-type-name">Name</Label>
            <Input id="leave-type-name" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-destructive-text">{form.formState.errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-type-quota">Quota</Label>
            <Input id="leave-type-quota" type="number" step="0.5" min="0" {...form.register('quota', { valueAsNumber: true })} />
            {form.formState.errors.quota ? <p className="text-xs text-destructive-text">{form.formState.errors.quota.message}</p> : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
            <label htmlFor="carry-forward-switch" className="flex-1 cursor-pointer">
              <p className="text-sm font-medium text-neutral-900">Carry Forward</p>
              <p className="text-xs text-neutral-500">Allow unused days to roll over.</p>
            </label>
            <Switch 
              id="carry-forward-switch"
              checked={form.watch('carryForward')} 
              onCheckedChange={(checked) => {
                form.setValue('carryForward', checked, { shouldDirty: true });
              }} 
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
            <label htmlFor="paid-leave-switch" className="flex-1 cursor-pointer">
              <p className="text-sm font-medium text-neutral-900">Paid Leave</p>
              <p className="text-xs text-neutral-500">Track paid balance for approvals.</p>
            </label>
            <Switch 
              id="paid-leave-switch"
              checked={form.watch('isPaid')} 
              onCheckedChange={(checked) => {
                form.setValue('isPaid', checked, { shouldDirty: true });
              }} 
            />
          </div>
        </form>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border border-neutral-200 px-4 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="leave-type-form"
            disabled={mutation.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
