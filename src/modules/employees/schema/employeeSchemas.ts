import { z } from 'zod';

export const employeeFiltersSchema = z.object({
  search: z.string().optional().default(''),
  roleId: z.string().optional(),
  attendanceStatus: z
    .enum(['PRESENT', 'ABSENT', 'WORK_FROM_HOME', 'HALF_DAY', 'NO_RECORD'])
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(25),
});

export type EmployeeFiltersInput = z.infer<typeof employeeFiltersSchema>;
