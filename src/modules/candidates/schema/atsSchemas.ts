import { z } from 'zod';

export const moveApplicationStageSchema = z.object({
  toStageId: z.string().min(1),
  note: z.string().trim().optional().nullable(),
});

export const createPipelineStageSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().trim().min(1, 'Stage name is required').max(50),
  afterStageId: z.string().min(1).optional().nullable(),
  stageType: z.enum(['DEFAULT', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).default('DEFAULT'),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(50).optional(),
  order: z.number().optional(),
  stageType: z.enum(['DEFAULT', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']).optional(),
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
  backupInterviewers: z.array(z.string().min(1)).default([]),
});

export const stageInterviewAssignmentRequestSchema = z.object({
  assignments: z.array(stageInterviewAssignmentSchema).min(1),
  jobPostingId: z.string().optional(),
});

export const stageInterviewWarningRequestSchema = z.object({
  assignments: z.array(stageInterviewAssignmentSchema).default([]),
  jobPostingId: z.string().optional(),
});

export const acceptInterviewSchema = z.object({
  scheduledStartAt: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().min(15).max(240).default(30),
}).superRefine((value, ctx) => {
  if (value.scheduledStartAt && new Date(value.scheduledStartAt).getTime() < Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['scheduledStartAt'],
      message: 'Interview cannot be scheduled in the past',
    });
  }
});

export interface MoveApplicationStageInput {
  toStageId: string;
  note?: string | null;
}

export interface CreatePipelineStageInput {
  jobPostingId: string;
  name: string;
  afterStageId?: string | null;
  stageType: 'DEFAULT' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  dueDate?: string | null;
}

export interface UpdatePipelineStageInput {
  name?: string;
  order?: number;
  stageType?: 'DEFAULT' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
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
  backupInterviewers?: string[];
}

export interface AcceptInterviewInput {
  scheduledStartAt?: string | null;
  durationMinutes: number;
}
