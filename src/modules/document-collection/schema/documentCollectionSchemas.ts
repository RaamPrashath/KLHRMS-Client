import { z } from 'zod';

export const documentCollectionFieldInputSchema = z.object({
  id: z.string().optional().nullable(),
  fieldType: z.enum(['FILE_UPLOAD', 'SHORT_TEXT', 'LONG_TEXT', 'DATE']),
  name: z.string().min(1, 'Field name is required'),
  description: z.string().optional().nullable(),
  required: z.boolean(),
  order: z.number().int().positive().optional().nullable(),
  allowedFormatGroup: z.enum(['IMAGE', 'FILE', 'VIDEO', 'ALL']).optional(),
  maxSizeBytes: z.number().int().positive().optional().nullable(),
});

export const documentCollectionTemplateCreatePayloadSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  fields: z.array(documentCollectionFieldInputSchema).optional(),
});

export const documentCollectionTemplateUpdatePayloadSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  fields: z.array(documentCollectionFieldInputSchema).optional(),
});

export const documentCollectionTemplateCopyPayloadSchema = z.object({
  name: z.string().optional(),
});

export const documentCollectionSendPayloadSchema = z.object({
  templateId: z.string().min(1, 'Select a document collection template'),
  applicationIds: z.array(z.string().min(1)).min(1, 'Select at least one candidate'),
});

export const documentCollectionSubmitPayloadSchema = z.object({
  answers: z.array(z.object({
    fieldId: z.string().min(1),
    value: z.string().optional().nullable(),
    fileBase64: z.string().optional().nullable(),
    fileName: z.string().optional().nullable(),
    fileType: z.string().optional().nullable(),
    fileSize: z.number().optional().nullable(),
  })),
});

export type DocumentCollectionFieldInputPayload = z.infer<typeof documentCollectionFieldInputSchema>;
export type DocumentCollectionTemplateCreatePayload = z.infer<typeof documentCollectionTemplateCreatePayloadSchema>;
export type DocumentCollectionTemplateUpdatePayload = z.infer<typeof documentCollectionTemplateUpdatePayloadSchema>;
export type DocumentCollectionTemplateCopyPayload = z.infer<typeof documentCollectionTemplateCopyPayloadSchema>;
export type DocumentCollectionSendPayload = z.infer<typeof documentCollectionSendPayloadSchema>;
export type DocumentCollectionSubmitPayload = z.infer<typeof documentCollectionSubmitPayloadSchema>;
