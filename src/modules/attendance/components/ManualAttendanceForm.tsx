'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { useManualAttendanceMutation } from '@/modules/attendance/hooks/mutations/attendance';
import type { ApiError } from '@/modules/attendance/types/attendanceTypes';

// ─── Local form schema ────────────────────────────────────────────────────────
// The user picks a date once, then enters clock-in and clock-out as time-only
// (HH:MM). We combine them into full ISO datetimes before sending to the API.

const formSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    clock_in_time: z.string().optional(),   // "HH:MM"
    clock_out_time: z.string().optional(),  // "HH:MM"
  })
  .refine(
    (d) => {
      if (!d.clock_in_time || !d.clock_out_time) return true;
      return d.clock_out_time > d.clock_in_time;
    },
    { message: 'Clock-out must be after clock-in', path: ['clock_out_time'] },
  );

type FormValues = z.infer<typeof formSchema>;

// ─── Helper: combine date + time → ISO datetime string ───────────────────────
// The backend expects UTC ISO datetimes. The user is in IST (UTC+5:30),
// so we treat the entered time as IST and convert to UTC.
function toISOFromIST(date: string, time: string): string {
  // Build a datetime string in IST and convert to UTC ISO
  // "2025-01-12" + "06:40" → "2025-01-12T06:40:00+05:30" → UTC ISO
  const istString = `${date}T${time}:00+05:30`;
  return new Date(istString).toISOString();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ManualAttendanceFormProps {
  orgSlug: string;
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualAttendanceForm({
  orgSlug,
  memberId,
  open,
  onOpenChange,
}: Readonly<ManualAttendanceFormProps>) {
  const mutation = useManualAttendanceMutation(orgSlug, memberId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: '',
      clock_in_time: '',
      clock_out_time: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync({
        target_member_id: memberId,
        date: values.date,
        clock_in:
          values.clock_in_time ? toISOFromIST(values.date, values.clock_in_time) : undefined,
        clock_out:
          values.clock_out_time ? toISOFromIST(values.date, values.clock_out_time) : undefined,
      });
      form.reset();
      onOpenChange(false);
    } catch (err: unknown) {
      let message = 'An unexpected error occurred.';
      if (err instanceof Error) {
        try { message = (JSON.parse(err.message) as ApiError).message; } catch { message = err.message; }
      }
      form.setError('root', { message });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      form.clearErrors();
    }
    onOpenChange(nextOpen);
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Manual Attendance Entry</SheetTitle>
          <SheetDescription>
            Record attendance for a specific date. Times are in Indian Standard Time.
          </SheetDescription>
        </SheetHeader>

        <form
          id="manual-attendance-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 pt-2 flex-1 overflow-y-auto"
          noValidate
        >
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-date" className="text-[13px] font-medium text-neutral-700">
              Date <span className="text-destructive-text">*</span>
            </Label>
            <Input
              id="manual-date"
              type="date"
              aria-invalid={!!form.formState.errors.date}
              {...form.register('date')}
            />
            {form.formState.errors.date && (
              <p className="text-xs text-destructive-text">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          {/* Clock In — time only */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-clock-in" className="text-[13px] font-medium text-neutral-700">
              Clock In <span className="text-neutral-400 font-normal">(IST)</span>
            </Label>
            <Input
              id="manual-clock-in"
              type="time"
              aria-invalid={!!form.formState.errors.clock_in_time}
              {...form.register('clock_in_time')}
            />
            {form.formState.errors.clock_in_time && (
              <p className="text-xs text-destructive-text">
                {form.formState.errors.clock_in_time.message}
              </p>
            )}
          </div>

          {/* Clock Out — time only */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="manual-clock-out" className="text-[13px] font-medium text-neutral-700">
              Clock Out <span className="text-neutral-400 font-normal">(IST)</span>
            </Label>
            <Input
              id="manual-clock-out"
              type="time"
              aria-invalid={!!form.formState.errors.clock_out_time}
              {...form.register('clock_out_time')}
            />
            {form.formState.errors.clock_out_time && (
              <p className="text-xs text-destructive-text">
                {form.formState.errors.clock_out_time.message}
              </p>
            )}
          </div>

          {/* Root / server error */}
          {rootError && (
            <p className="text-xs text-destructive-text" role="alert">
              {rootError}
            </p>
          )}
        </form>

        <SheetFooter className="px-4 pb-4 pt-3 border-t border-neutral-100 flex gap-2">
          <SheetClose asChild>
            <button
              type="button"
              className="flex-1 h-9 px-4 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors duration-100"
            >
              Cancel
            </button>
          </SheetClose>
          <button
            type="submit"
            form="manual-attendance-form"
            disabled={mutation.isPending}
            className="flex-1 h-9 px-4 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-2 transition-colors duration-100"
          >
            {mutation.isPending ? (
              <svg
                className="animate-spin size-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            Save
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
