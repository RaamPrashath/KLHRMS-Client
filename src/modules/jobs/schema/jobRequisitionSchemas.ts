import { z } from 'zod';

import { EMPLOYMENT_TYPES } from '@/modules/jobs/types/jobRequisitionTypes';

export const createJobRequisitionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  departmentId: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  openings: z.number().int().min(1, 'At least one opening is required'),
  salaryMin: z.number().nonnegative().optional().nullable(),
  salaryMax: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1, 'Currency is required').max(10, 'Currency is too long'),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  skills: z.array(z.string()).default([]),
  location: z.string().optional().nullable(),
  isRemote: z.boolean().default(false),
  targetDate: z.string().optional().nullable(),
}).refine(
  (value) => {
    if (value.salaryMin == null || value.salaryMax == null) return true;
    return value.salaryMax >= value.salaryMin;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  },
);

export const jobRequisitionDecisionSchema = z.object({
  comment: z.string().optional().nullable(),
});

export type CreateJobRequisitionInput = z.infer<typeof createJobRequisitionSchema>;
export type JobRequisitionDecisionInput = z.infer<typeof jobRequisitionDecisionSchema>;
