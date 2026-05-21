'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import type { LeaveMemberSummary, LeavePermissionScope, LeaveTypeRecord, HolidayRecord } from '@/modules/leave/types/leaveTypes';
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

function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr: string, holidays: HolidayRecord[]): boolean {
  return holidays.some((h) => h.isHoliday && h.holidayDate.slice(0, 10) === dateStr);
}

function getExcludedInfo(startDate: string, endDate: string, holidays: HolidayRecord[]) {
  const totalDays = Math.floor((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) + 1;
  let weekends = 0;
  let holidaysCount = 0;
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    if (isWeekend(dateStr)) weekends++;
    else if (isHoliday(dateStr, holidays)) holidaysCount++;
    current.setDate(current.getDate() + 1);
  }
  return { totalDays, weekends, holidaysCount, netDays: totalDays - weekends - holidaysCount };
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
  const { data: holidays = [] } = useHolidays(orgSlug, memberId);
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

  const startDate = useWatch({ control: form.control, name: 'startDate' });
  const endDate = useWatch({ control: form.control, name: 'endDate' });
  const selectedMemberId = useWatch({ control: form.control, name: 'memberId' });
  const selectedLeaveTypeId = useWatch({ control: form.control, name: 'leaveTypeId' });

  const leaveInfo = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    return getExcludedInfo(startDate, endDate, holidays);
  }, [startDate, endDate, holidays]);

  useEffect(() => {
    if (leaveInfo) {
      form.setValue('days', leaveInfo.netDays, { shouldValidate: true });
    }
  }, [leaveInfo, form]);

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
                  value={selectedMemberId}
                  onValueChange={(value) => form.setValue('memberId', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="leave-member" className="h-10 w-full">
                    <SelectValue placeholder="Select a member" />
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
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-type" className="text-sm font-medium text-neutral-900">
                Leave Type
              </Label>
              <Select
                value={selectedLeaveTypeId}
                onValueChange={(value) => form.setValue('leaveTypeId', value, { shouldValidate: true })}
                disabled={leaveTypes.length === 0}
              >
                <SelectTrigger id="leave-type" className="h-10 w-full">
                  <SelectValue placeholder={leaveTypes.length === 0 ? 'No leave types available' : 'Select leave type'} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100]">
                  {leaveTypes.map((leaveType) => (
                    <SelectItem key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leaveTypes.length === 0 ? (
                <p className="text-xs text-neutral-500">Ask an admin to create a leave type before submitting requests.</p>
              ) : null}
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
                className="h-10 bg-neutral-50 text-neutral-900"
                disabled
                {...form.register('days', { valueAsNumber: true })}
              />
              {leaveInfo && leaveInfo.totalDays !== leaveInfo.netDays && (
                <p className="text-xs text-neutral-500">
                  {leaveInfo.totalDays} calendar day{leaveInfo.totalDays > 1 ? "s" : ""}
                  {leaveInfo.weekends > 0 ? ` · ${leaveInfo.weekends} weekend${leaveInfo.weekends > 1 ? "s" : ""} excluded` : ""}
                  {leaveInfo.holidaysCount > 0 ? ` · ${leaveInfo.holidaysCount} holiday${leaveInfo.holidaysCount > 1 ? "s" : ""} excluded` : ""}
                </p>
              )}
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
