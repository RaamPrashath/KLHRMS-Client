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
      <SheetContent className="flex flex-col overflow-hidden bg-white sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b border-neutral-100 pb-4">
          <SheetTitle className="text-xl font-semibold text-neutral-900">Apply Leave</SheetTitle>
          <SheetDescription className="text-sm text-neutral-600">
            Submit a leave request for review.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <form id="apply-leave-form" className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
            {createScope === 'organization' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="leave-member" className="text-sm font-medium text-neutral-900">
                  Member
                </Label>
                <Select
                  value={form.watch('memberId')}
                  onValueChange={(value) => form.setValue('memberId', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="leave-member" className="h-10">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-type" className="text-sm font-medium text-neutral-900">
                Leave Type
              </Label>
              <Select
                value={form.watch('leaveTypeId')}
                onValueChange={(value) => form.setValue('leaveTypeId', value, { shouldValidate: true })}
              >
                <SelectTrigger id="leave-type" className="h-10">
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="leave-start-date" className="text-sm font-medium text-neutral-900">
                  Start Date
                </Label>
                <Input id="leave-start-date" type="date" className="h-10" {...form.register('startDate')} />
                {form.formState.errors.startDate ? (
                  <p className="text-xs text-destructive-text">{form.formState.errors.startDate.message}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="leave-end-date" className="text-sm font-medium text-neutral-900">
                  End Date
                </Label>
                <Input id="leave-end-date" type="date" className="h-10" {...form.register('endDate')} />
                {form.formState.errors.endDate ? (
                  <p className="text-xs text-destructive-text">{form.formState.errors.endDate.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-days" className="text-sm font-medium text-neutral-900">
                Days
              </Label>
              <Input
                id="leave-days"
                type="number"
                step="0.5"
                min="0.5"
                className="h-10"
                {...form.register('days', { valueAsNumber: true })}
              />
              {form.formState.errors.days ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.days.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-reason" className="text-sm font-medium text-neutral-900">
                Reason
              </Label>
              <Textarea
                id="leave-reason"
                rows={4}
                className="resize-none"
                placeholder="Provide a brief reason for your leave request..."
                {...form.register('reason')}
              />
              {form.formState.errors.reason ? (
                <p className="text-xs text-destructive-text">{form.formState.errors.reason.message}</p>
              ) : null}
            </div>
          </form>
        </div>

        <SheetFooter className="shrink-0 flex-row gap-3 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="apply-leave-form"
            disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
