import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(255),
  headMemberId: z.string().optional().or(z.literal('')),
  parentDepartmentId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const teamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(255),
  description: z.string().optional().or(z.literal('')),
  leadMemberId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const teamMemberSchema = z.object({
  memberId: z.string().min(1, 'Employee is required'),
  role: z.string().trim().max(120).optional().or(z.literal('')),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
