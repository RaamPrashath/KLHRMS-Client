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
import { Textarea } from '@/components/ui/textarea';

import { holidaySchema, type HolidayInput } from '@/modules/leave/schema/leaveSchemas';
import { useCreateHoliday } from '@/modules/leave/hooks/useCreateHoliday';
import { useUpdateHoliday } from '@/modules/leave/hooks/useUpdateHoliday';
import type { HolidayRecord } from '@/modules/leave/types/leaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';

interface HolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  holiday?: HolidayRecord | null;
}

type HolidayFormValues = z.input<typeof holidaySchema>;

export function HolidayDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  holiday,
}: Readonly<HolidayDialogProps>) {
  const createMutation = useCreateHoliday(orgSlug, memberId);
  const updateMutation = useUpdateHoliday(orgSlug, memberId);
  const mutation = holiday ? updateMutation : createMutation;

  const form = useForm<HolidayFormValues, unknown, HolidayInput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      holidayDate: '',
      isRecurring: false,
      description: '',
    },
  });

  useEffect(() => {
    form.reset({
      name: holiday?.name ?? '',
      holidayDate: holiday?.holidayDate ?? '',
      isRecurring: holiday?.isRecurring ?? false,
      description: holiday?.description ?? '',
    });
  }, [form, holiday, open]);

  async function onSubmit(values: HolidayInput) {
    try {
      if (holiday) {
        await updateMutation.mutateAsync({ holidayId: holiday.id, data: values });
        toast.success('Holiday updated');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Holiday created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to save holiday'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-surface">
        <DialogHeader>
          <DialogTitle>{holiday ? 'Edit Holiday' : 'Create Holiday'}</DialogTitle>
          <DialogDescription>Maintain your organization holiday calendar.</DialogDescription>
        </DialogHeader>

        <form id="holiday-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holiday-name">Name</Label>
            <Input id="holiday-name" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-destructive-text">{form.formState.errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holiday-date">Holiday Date</Label>
            <Input id="holiday-date" type="date" {...form.register('holidayDate')} />
            {form.formState.errors.holidayDate ? <p className="text-xs text-destructive-text">{form.formState.errors.holidayDate.message}</p> : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-100 p-3">
            <label htmlFor="recurring-switch" className="flex-1 cursor-pointer">
              <p className="text-sm font-medium text-neutral-900">Recurring yearly</p>
              <p className="text-xs text-neutral-500">Keep this holiday repeating every year.</p>
            </label>
            <Switch 
              id="recurring-switch"
              checked={form.watch('isRecurring')} 
              onCheckedChange={(checked) => {
                form.setValue('isRecurring', checked, { shouldDirty: true });
              }} 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="holiday-description">Description</Label>
            <Textarea id="holiday-description" rows={4} {...form.register('description')} />
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
            form="holiday-form"
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
