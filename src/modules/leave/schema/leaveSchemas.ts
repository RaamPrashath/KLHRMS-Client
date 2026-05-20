import { z } from 'zod';

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  quota: z.coerce.number().min(0, 'Quota must be 0 or more'),
  carryForward: z.boolean().default(false),
  isPaid: z.boolean().default(true),
  color: z.string().trim().max(20).optional().or(z.literal('')),
});

export const holidaySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Holiday date must be YYYY-MM-DD'),
  isRecurring: z.boolean().default(false),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    memberId: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    days: z.coerce.number().positive('Days must be greater than 0'),
    reason: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const leaveDecisionSchema = z.object({
  approverComment: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const leaveBalanceAssignmentSchema = z.object({
  memberId: z.string().min(1, 'Member is required'),
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  year: z.coerce.number().int().min(2000, 'Year must be 2000 or later').max(3000, 'Year must be 3000 or earlier'),
  allocated: z.coerce.number().min(0, 'Allocated days must be 0 or more'),
  carriedForward: z.coerce.number().min(0, 'Carry forward must be 0 or more').default(0),
  lapsed: z.coerce.number().min(0, 'Lapsed days must be 0 or more').default(0),
});

export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;
export type LeaveBalanceAssignmentInput = z.infer<typeof leaveBalanceAssignmentSchema>;
