import { z } from 'zod';

import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  HIRING_REASONS,
  PRIORITIES,
  SALARY_VISIBILITY_OPTIONS,
} from '@/modules/jobs/types/jobRequisitionTypes';

export const createJobRequisitionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  departmentId: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  openings: z.number().int().min(1, 'At least one opening is required'),
  hiringReason: z.enum(HIRING_REASONS).optional().nullable(),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  replacementForId: z.string().optional().nullable(),
  businessJustification: z.string().optional().nullable(),
  salaryMin: z.number().nonnegative().optional().nullable(),
  salaryMax: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1, 'Currency is required').max(10, 'Currency is too long').default('INR'),
  salaryVisibility: z.enum(SALARY_VISIBILITY_OPTIONS).default('INTERNAL_ONLY'),
  skills: z.array(z.string()).default([]),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  minExperience: z.number().int().nonnegative().optional().nullable(),
  education: z.string().optional().nullable(),
  certifications: z.array(z.string()).default([]),
  roleSummary: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  requirementsRich: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  aboutTeam: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
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

export const updateJobRequisitionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  departmentId: z.string().optional().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  openings: z.number().int().min(1).optional(),
  hiringReason: z.enum(HIRING_REASONS).optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  replacementForId: z.string().optional().nullable(),
  businessJustification: z.string().optional().nullable(),
  salaryMin: z.number().nonnegative().optional().nullable(),
  salaryMax: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
  salaryVisibility: z.enum(SALARY_VISIBILITY_OPTIONS).optional(),
  skills: z.array(z.string()).optional(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  minExperience: z.number().int().nonnegative().optional().nullable(),
  education: z.string().optional().nullable(),
  certifications: z.array(z.string()).optional(),
  roleSummary: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  requirementsRich: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  aboutTeam: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  isRemote: z.boolean().optional(),
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
  comment: z.string().min(1, 'A comment is required when rejecting').optional().nullable(),
  title: z.string().min(1, 'Title is required').max(255).optional(),
  departmentId: z.string().optional().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  openings: z.number().int().min(1).optional(),
  salaryMin: z.number().nonnegative().optional().nullable(),
  salaryMax: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  isRemote: z.boolean().optional(),
  targetDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  roleSummary: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  requirementsRich: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  aboutTeam: z.string().optional().nullable(),
  hiringReason: z.enum(HIRING_REASONS).optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  businessJustification: z.string().optional().nullable(),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  minExperience: z.number().int().nonnegative().optional().nullable(),
  education: z.string().optional().nullable(),
  certifications: z.array(z.string()).optional(),
}).refine(
  (value) => {
    if (value.salaryMin == null || value.salaryMax == null) return true;
    return value.salaryMax >= value.salaryMin;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  },
).refine(
  (value) => {
    if (Object.prototype.hasOwnProperty.call(value, 'salaryMin')) {
      return value.salaryMin != null;
    }
    return true;
  },
  {
    message: 'Annual salary is required to approve a requisition',
    path: ['salaryMin'],
  },
);

export type CreateJobRequisitionInput = z.input<typeof createJobRequisitionSchema>;
export type UpdateJobRequisitionInput = z.input<typeof updateJobRequisitionSchema>;
export type JobRequisitionDecisionInput = z.input<typeof jobRequisitionDecisionSchema>;
