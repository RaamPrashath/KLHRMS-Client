import { z } from 'zod';

export const clockInSchema = z.object({
  target_member_id: z.string().optional(),
  clock_in: z.iso.datetime().optional(),
  work_location: z.enum(['OFFICE', 'REMOTE']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().min(0).optional(),
  project_id: z.string().min(1, 'Project is required'),
  project_task_id: z.string().min(1, 'Task is required'),
  description: z.string().max(1000).optional().or(z.literal('')),
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
  employee_name: z.string().optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ManualEntryInput = z.infer<typeof manualEntrySchema>;
export type DeleteDayEntryInput = z.infer<typeof deleteDayEntrySchema>;
export type AttendanceFiltersInput = z.infer<typeof attendanceFiltersSchema>;
