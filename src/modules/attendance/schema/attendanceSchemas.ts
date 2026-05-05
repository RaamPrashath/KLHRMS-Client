import { z } from 'zod';

export const clockInSchema = z.object({
  target_member_id: z.string().optional(),
  clock_in: z.iso.datetime().optional(),
});

export const clockOutSchema = z.object({
  target_member_id: z.string().optional(),
  clock_out: z.iso.datetime().optional(),
});

export const manualEntrySchema = z
  .object({
    target_member_id: z.string().min(1, 'Member is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    clock_in: z.iso.datetime().optional(),
    clock_out: z.iso.datetime().optional(),
  })
  .refine(
    (d) => !(d.clock_in && d.clock_out) || d.clock_out > d.clock_in,
    { message: 'clock_out must be after clock_in', path: ['clock_out'] },
  );

export const deleteDayEntrySchema = z.object({
  target_member_id: z.string().min(1, 'Member is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const attendanceFiltersSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  status: z.enum(['PRESENT', 'HALF_DAY', 'ABSENT']).optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(200).optional(),
  target_member_id: z.string().optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ManualEntryInput = z.infer<typeof manualEntrySchema>;
export type DeleteDayEntryInput = z.infer<typeof deleteDayEntrySchema>;
export type AttendanceFiltersInput = z.infer<typeof attendanceFiltersSchema>;
