import { z } from 'zod';

export const projectStatusOptions = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, 'Project name is required').max(255),
    teamId: z.string().optional().or(z.literal('')),
    clientName: z.string().trim().max(255).optional().or(z.literal('')),
    budget: z.coerce.number().min(0).optional().nullable(),
    budgetedHours: z.coerce.number().min(0).optional().nullable(),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    status: z.enum(projectStatusOptions),
    billable: z.boolean(),
    description: z.string().optional().or(z.literal('')),
  })
  .refine(
    (value) => !value.startDate || !value.endDate || value.endDate >= value.startDate,
    { path: ['endDate'], message: 'End date must be on or after the start date' },
  );

export const projectMemberSchema = z.object({
  memberId: z.string().min(1, 'Employee is required'),
  role: z.string().trim().max(120).optional().or(z.literal('')),
  allocatedHours: z.coerce.number().min(0).optional().nullable(),
});

export const projectTaskSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required').max(255),
});

export type ProjectFormInput = z.input<typeof projectSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
export type ProjectTaskInput = z.infer<typeof projectTaskSchema>;
