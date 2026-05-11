import { z } from 'zod';

export const moveApplicationStageSchema = z.object({
  toStageId: z.string().min(1),
  note: z.string().trim().optional().nullable(),
});

export const createPipelineStageSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().trim().min(1, 'Stage name is required').max(120),
  afterStageId: z.string().min(1).optional().nullable(),
  meetingEnabled: z.boolean().default(false),
  offerLetterEnabled: z.boolean().default(false),
  evaluationEnabled: z.boolean().default(false),
  evaluationType: z.enum(['NUMERIC', 'TEXT', 'CHECKBOX']).optional().nullable(),
  evaluationIncludeTotal: z.boolean().default(false),
  evaluationIncludeAnalysis: z.boolean().default(false),
  dueDate: z.string().datetime().optional().nullable(),
  extendToNextWorkingDay: z.boolean().default(false),
  evaluationCategories: z
    .array(
      z.object({
        id: z.string().min(1).optional().nullable(),
        name: z.string().trim().min(1, 'Category name is required').max(120),
        order: z.number().int().min(1).optional(),
      }),
    )
    .default([]),
}).superRefine((value, ctx) => {
  if (value.meetingEnabled && !value.dueDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date is required when online meeting is enabled',
    });
  }
});

export const updatePipelineStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(120).optional(),
  order: z.number().int().min(1).optional(),
  meetingEnabled: z.boolean().optional(),
  offerLetterEnabled: z.boolean().optional(),
  evaluationEnabled: z.boolean().optional(),
  evaluationType: z.enum(['NUMERIC', 'TEXT', 'CHECKBOX']).optional().nullable(),
  evaluationIncludeTotal: z.boolean().optional(),
  evaluationIncludeAnalysis: z.boolean().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  dueDateEnabled: z.boolean().optional(),
  extendToNextWorkingDay: z.boolean().optional(),
  evaluationCategories: z
    .array(
      z.object({
        id: z.string().min(1).optional().nullable(),
        name: z.string().trim().min(1, 'Category name is required').max(120),
        order: z.number().int().min(1).optional(),
      }),
    )
    .optional(),
}).superRefine((value, ctx) => {
  if (value.meetingEnabled && value.dueDateEnabled === false) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date is required when online meeting is enabled',
    });
  }
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

export interface MoveApplicationStageInput {
  toStageId: string;
  note?: string | null;
}

export interface StageEvaluationCategoryInput {
  id?: string | null;
  name: string;
  order?: number;
}

export interface CreatePipelineStageInput {
  jobPostingId: string;
  name: string;
  afterStageId?: string | null;
  meetingEnabled: boolean;
  offerLetterEnabled: boolean;
  evaluationEnabled: boolean;
  evaluationType?: 'NUMERIC' | 'TEXT' | 'CHECKBOX' | null;
  evaluationIncludeTotal: boolean;
  evaluationIncludeAnalysis: boolean;
  dueDate?: string | null;
  extendToNextWorkingDay: boolean;
  evaluationCategories: StageEvaluationCategoryInput[];
}

export interface UpdatePipelineStageInput {
  name?: string;
  order?: number;
  meetingEnabled?: boolean;
  offerLetterEnabled?: boolean;
  evaluationEnabled?: boolean;
  evaluationType?: 'NUMERIC' | 'TEXT' | 'CHECKBOX' | null;
  evaluationIncludeTotal?: boolean;
  evaluationIncludeAnalysis?: boolean;
  dueDate?: string | null;
  dueDateEnabled?: boolean;
  extendToNextWorkingDay?: boolean;
  evaluationCategories?: StageEvaluationCategoryInput[];
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
