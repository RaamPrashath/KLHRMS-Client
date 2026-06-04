import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(255),
  headMemberId: z.string().optional().or(z.literal('')),
  parentDepartmentId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
