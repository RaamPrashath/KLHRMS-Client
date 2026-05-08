import { z } from 'zod';

export const moveApplicationStageSchema = z.object({
  toStageId: z.string().min(1),
  note: z.string().trim().optional().nullable(),
});

export const createPipelineStageSchema = z.object({
  jobPostingId: z.string().min(1),
  name: z.string().trim().min(1, 'Stage name is required').max(120),
  afterStageId: z.string().min(1).optional().nullable(),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(120).optional(),
  order: z.number().int().min(1).optional(),
});

export interface MoveApplicationStageInput extends z.infer<typeof moveApplicationStageSchema> {}
export interface CreatePipelineStageInput extends z.infer<typeof createPipelineStageSchema> {}
export interface UpdatePipelineStageInput extends z.infer<typeof updatePipelineStageSchema> {}
