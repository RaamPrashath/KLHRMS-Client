import { z } from 'zod';

export const moveApplicationStageSchema = z.object({
  toStageId: z.string().min(1),
  note: z.string().trim().optional().nullable(),
  score: z.number().min(0).max(100).optional().nullable(),
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'HOLD', 'NO_HIRE']).optional().nullable(),
  strengths: z.string().optional().nullable(),
  areasOfImprovement: z.string().optional().nullable(),
});

export const createPipelineStageSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().trim().min(1, 'Stage name is required').max(50),
  afterStageId: z.string().min(1).optional().nullable(),
  stageType: z.enum(['DEFAULT', 'INTERVIEW', 'OFFER', 'HIRED', 'ONBOARDING', 'REJECTED']).default('DEFAULT'),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(50).optional(),
  order: z.number().optional(),
  stageType: z.enum(['DEFAULT', 'INTERVIEW', 'OFFER', 'HIRED', 'ONBOARDING', 'REJECTED']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  dueDateEnabled: z.boolean().optional(),
});

export const extendPipelineStageSchema = z.object({
  stageId: z.string().min(1),
});

export const createInterviewMeetingSchema = z.object({
  mode: z.enum(['SCHEDULE', 'START_NOW']),
  scheduledStartAt: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(30),
  title: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.mode === 'SCHEDULE' && !value.scheduledStartAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduledStartAt'],
      message: 'Start time is required',
    });
  }
});

export const stageInterviewAssignmentSchema = z.object({
  applicationId: z.string().min(1),
  interviewerMemberId: z.string().min(1),
  scheduledStartAt: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(30),
  meetLink: z.string().url().max(2048).optional().nullable(),
});

export const stageInterviewAssignmentRequestSchema = z.object({
  assignments: z.array(stageInterviewAssignmentSchema).min(1),
  jobPostingId: z.string().optional(),
});

export const stageInterviewWarningRequestSchema = z.object({
  assignments: z.array(stageInterviewAssignmentSchema).default([]),
  jobPostingId: z.string().optional(),
});

export const proposedSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const acceptInterviewSchema = z.object({
  proposedSlots: z.array(proposedSlotSchema).min(1, 'At least one slot is required'),
  durationMinutes: z.number().int().min(15).max(240).default(30),
});

export interface MoveApplicationStageInput {
  toStageId: string;
  note?: string | null;
  score?: number | null;
  recommendation?: 'STRONG_HIRE' | 'HIRE' | 'HOLD' | 'NO_HIRE' | null;
  strengths?: string | null;
  areasOfImprovement?: string | null;
}

export interface CreatePipelineStageInput {
  jobPostingId: string;
  name: string;
  afterStageId?: string | null;
  stageType: 'DEFAULT' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'ONBOARDING' | 'REJECTED';
  dueDate?: string | null;
}

export interface UpdatePipelineStageInput {
  name?: string;
  order?: number;
  stageType?: 'DEFAULT' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'ONBOARDING' | 'REJECTED';
  dueDate?: string | null;
  dueDateEnabled?: boolean;
}

export interface ExtendPipelineStageInput {
  stageId: string;
}

export interface CreateInterviewMeetingInput {
  mode: 'SCHEDULE' | 'START_NOW';
  scheduledStartAt?: string | null;
  durationMinutes: number;
  title?: string | null;
  notes?: string | null;
}

export interface UpdateInterviewMeetingInput {
  scheduledStartAt: string;
  durationMinutes: number;
  title?: string | null;
  notes?: string | null;
}

export interface StageInterviewAssignmentInput {
  applicationId: string;
  interviewerMemberId: string;
  scheduledStartAt?: string | null;
  durationMinutes: number;
  meetLink?: string | null;

}

export interface ProposedSlotInput {
  startTime: string;
  endTime: string;
}

export interface AcceptInterviewInput {
  proposedSlots: ProposedSlotInput[];
  durationMinutes: number;
}
