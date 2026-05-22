'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  leaveBalanceAssignmentSchema,
  type LeaveBalanceAssignmentInput,
} from '@/modules/leave/schema/leaveSchemas';
import { useUpsertLeaveBalance } from '@/modules/leave/hooks/useUpsertLeaveBalance';
import type { LeaveBalanceRecord, LeaveMemberSummary, LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';

interface LeaveBalanceAssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  members: LeaveMemberSummary[];
  leaveTypes: LeaveTypeRecord[];
  balance?: LeaveBalanceRecord | null;
}

type LeaveBalanceAssignmentFormValues = z.input<typeof leaveBalanceAssignmentSchema>;

function currentYear() {
  return new Date().getFullYear();
}

export function LeaveBalanceAssignmentSheet({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  members,
  leaveTypes,
  balance,
}: Readonly<LeaveBalanceAssignmentSheetProps>) {
  const mutation = useUpsertLeaveBalance(orgSlug, memberId);
  const form = useForm<LeaveBalanceAssignmentFormValues, unknown, LeaveBalanceAssignmentInput>({
    resolver: zodResolver(leaveBalanceAssignmentSchema),
    defaultValues: {
      memberId: '',
      leaveTypeId: '',
      year: currentYear(),
      allocated: 0,
      carriedForward: 0,
      lapsed: 0,
    },
  });

  const selectedMemberId = useWatch({ control: form.control, name: 'memberId' });
  const selectedLeaveTypeId = useWatch({ control: form.control, name: 'leaveTypeId' });
  const allocated = Number(useWatch({ control: form.control, name: 'allocated' }) || 0);
  const carriedForward = Number(useWatch({ control: form.control, name: 'carriedForward' }) || 0);
  const lapsed = Number(useWatch({ control: form.control, name: 'lapsed' }) || 0);
  const used = balance?.used ?? 0;
  const projectedRemaining = allocated + carriedForward - used - lapsed;

  useEffect(() => {
    if (!open) return;
    form.reset({
      memberId: balance?.memberId ?? '',
      leaveTypeId: balance?.leaveTypeId ?? '',
      year: balance?.year ?? currentYear(),
      allocated: balance?.allocated ?? 0,
      carriedForward: balance?.carriedForward ?? 0,
      lapsed: balance?.lapsed ?? 0,
    });
  }, [balance, form, open]);

  async function onSubmit(values: LeaveBalanceAssignmentInput) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Leave balance assigned');
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to assign leave balance'));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden bg-white sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-neutral-100 pb-4">
          <SheetTitle className="text-xl font-semibold text-neutral-900">Assign Leave Balance</SheetTitle>
          <SheetDescription>
            Manually set yearly allocation for an employee. Used days remain managed by approvals.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <form id="assign-leave-balance-form" className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="balance-member">Employee</Label>
              <Select
                value={selectedMemberId}
                onValueChange={(value) => form.setValue('memberId', value, { shouldValidate: true })}
              >
                <SelectTrigger id="balance-member" className="h-10 w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {members.map((member) => (
                    <SelectItem key={member.memberId} value={member.memberId}>
                      {member.name ?? member.email ?? member.memberId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.memberId ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.memberId.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="balance-leave-type">Leave Type</Label>
              <Select
                value={selectedLeaveTypeId}
                onValueChange={(value) => form.setValue('leaveTypeId', value, { shouldValidate: true })}
              >
                <SelectTrigger id="balance-leave-type" className="h-10 w-full">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {leaveTypes.map((leaveType) => (
                    <SelectItem key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.leaveTypeId ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.leaveTypeId.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="balance-year">Year</Label>
                <Input id="balance-year" type="number" min="2000" max="3000" className="h-10" {...form.register('year', { valueAsNumber: true })} />
                {form.formState.errors.year ? (
                  <p className="text-xs text-destructive-text">{form.formState.errors.year.message}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="balance-allocated">Allocated Days</Label>
                <Input id="balance-allocated" type="number" step="0.5" min="0" className="h-10" {...form.register('allocated', { valueAsNumber: true })} />
                {form.formState.errors.allocated ? (
                  <p className="text-xs text-destructive-text">{form.formState.errors.allocated.message}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="balance-carry">Carried Forward</Label>
                <Input id="balance-carry" type="number" step="0.5" min="0" className="h-10" {...form.register('carriedForward', { valueAsNumber: true })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="balance-lapsed">Lapsed Days</Label>
                <Input id="balance-lapsed" type="number" step="0.5" min="0" className="h-10" {...form.register('lapsed', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-700">
              <div className="flex justify-between">
                <span>Used days</span>
                <span className="font-mono">{used}</span>
              </div>
              <div className="mt-2 flex justify-between font-semibold text-neutral-900">
                <span>Projected remaining</span>
                <span className="font-mono">{projectedRemaining}</span>
              </div>
              {projectedRemaining < 0 ? (
                <p className="mt-2 text-xs text-destructive-text">
                  Allocation cannot be lower than already approved/used leave.
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <SheetFooter className="shrink-0 flex-row gap-3 border-t border-neutral-100 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-leave-balance-form"
            disabled={mutation.isPending || projectedRemaining < 0}
            className="flex-1 bg-primary text-white hover:bg-primary-hover"
          >
            {mutation.isPending ? 'Saving...' : 'Save Balance'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
