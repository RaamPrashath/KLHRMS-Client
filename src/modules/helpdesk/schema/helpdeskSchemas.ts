import { z } from 'zod';

export const helpdeskPriorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const generalHelpRequestSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(140),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.string().trim().min(1, 'Category is required').max(80),
  priority: z.enum(helpdeskPriorityOptions),
});

export type GeneralHelpRequestSchemaInput = z.infer<typeof generalHelpRequestSchema>;
