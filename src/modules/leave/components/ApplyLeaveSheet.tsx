'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { leaveRequestSchema, type LeaveRequestInput } from '@/modules/leave/schema/leaveSchemas';
import { useCreateLeaveRequest } from '@/modules/leave/hooks/useCreateLeaveRequest';
import type { LeaveMemberSummary, LeavePermissionScope, LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';

interface ApplyLeaveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  createScope: LeavePermissionScope;
  leaveTypes: LeaveTypeRecord[];
  members: LeaveMemberSummary[];
}

type ApplyLeaveFormValues = z.input<typeof leaveRequestSchema>;

function calculateDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function ApplyLeaveSheet({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  createScope,
  leaveTypes,
  members,
}: Readonly<ApplyLeaveSheetProps>) {
  const mutation = useCreateLeaveRequest(orgSlug, memberId);
  const form = useForm<ApplyLeaveFormValues, unknown, LeaveRequestInput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveTypeId: '',
      memberId: createScope === 'organization' ? undefined : memberId,
      startDate: '',
      endDate: '',
      days: 0,
      reason: '',
    },
  });

  const startDate = form.watch('startDate');
  const endDate = form.watch('endDate');

  useEffect(() => {
    const days = calculateDays(startDate, endDate);
    if (days > 0) {
      form.setValue('days', days, { shouldValidate: true });
    }
  }, [startDate, endDate, form]);

  async function onSubmit(values: LeaveRequestInput) {
    try {
      await mutation.mutateAsync({
        ...values,
        memberId: createScope === 'organization' ? values.memberId : undefined,
        reason: values.reason || '',
      });
      toast.success('Leave request created');
      form.reset({
        leaveTypeId: '',
        memberId: createScope === 'organization' ? undefined : memberId,
        startDate: '',
        endDate: '',
        days: 0,
        reason: '',
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to create leave request'));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto bg-surface">
        <SheetHeader>
          <SheetTitle>Apply Leave</SheetTitle>
          <SheetDescription>Submit a leave request for review.</SheetDescription>
        </SheetHeader>

        <form id="apply-leave-form" className="mt-6 flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {createScope === 'organization' ? (
            <div className="flex flex-col gap-1.5">
              <Label>Member</Label>
              <Select
                value={form.watch('memberId')}
                onValueChange={(value) => form.setValue('memberId', value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
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
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Leave Type</Label>
            <Select
              value={form.watch('leaveTypeId')}
              onValueChange={(value) => form.setValue('leaveTypeId', value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-start-date">Start Date</Label>
              <Input id="leave-start-date" type="date" {...form.register('startDate')} />
              {form.formState.errors.startDate ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.startDate.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-end-date">End Date</Label>
              <Input id="leave-end-date" type="date" {...form.register('endDate')} />
              {form.formState.errors.endDate ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.endDate.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-days">Days</Label>
            <Input id="leave-days" type="number" step="0.5" min="0.5" {...form.register('days', { valueAsNumber: true })} />
            {form.formState.errors.days ? (
              <p className="text-xs text-destructive-text">{form.formState.errors.days.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea id="leave-reason" rows={4} {...form.register('reason')} />
          </div>
        </form>

        <SheetFooter className="mt-6 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md border border-neutral-200 px-4 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="apply-leave-form"
            disabled={mutation.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
