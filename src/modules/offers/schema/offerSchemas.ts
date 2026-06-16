import { z } from 'zod';

export const offerDispatchPayloadSchema = z.object({
  templateId: z.string().min(1, 'Select an offer template'),
  categoryId: z.string().min(1, 'Select a template category'),
  applicationIds: z.array(z.string().min(1)).min(1, 'Select at least one candidate'),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const offerDownloadPayloadSchema = offerDispatchPayloadSchema.extend({
  format: z.enum(['pdf', 'docx']),
});

export const offerTemplateCopyPayloadSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export const offerTemplateCreatePayloadSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  logoUrl: z.string().max(4096).nullable().optional(),
  signatureUrl: z.string().max(4096).nullable().optional(),
  signatoryName: z.string().max(160).nullable().optional(),
  signatoryTitle: z.string().max(160).nullable().optional(),
  footerHtml: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  categories: z
    .array(z.object({
      name: z.string().min(1).max(80),
      slug: z.string().max(100).nullable().optional(),
      order: z.number().int().positive().nullable().optional(),
    }))
    .optional(),
});

export const offerTemplateUpdatePayloadSchema = offerTemplateCreatePayloadSchema
  .omit({ categories: true })
  .partial();

export const offerTemplateCategoryCreatePayloadSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().max(100).nullable().optional(),
  order: z.number().int().positive().nullable().optional(),
});

export const offerTemplateSectionUpsertPayloadSchema = z.object({
  sectionKey: z.string().min(1).max(80).nullable().optional(),
  sectionName: z.string().min(1).max(120),
  order: z.number().int().positive(),
  tiptapJson: z.record(z.string(), z.unknown()),
  html: z.string(),
});

export interface OfferDispatchPayload {
  templateId: string;
  categoryId: string;
  applicationIds: string[];
  expiresAt?: string | null;
}

export type OfferDownloadFormat = 'pdf' | 'docx';

export interface OfferDownloadPayload extends OfferDispatchPayload {
  format: OfferDownloadFormat;
}

export interface OfferTemplateCopyPayload {
  name?: string;
}

export interface OfferTemplateCategoryInput {
  name: string;
  slug?: string | null;
  order?: number | null;
}

export interface OfferTemplateCreatePayload {
  name: string;
  description?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  footerHtml?: string | null;
  websiteUrl?: string | null;
  categories?: OfferTemplateCategoryInput[];
}

export interface OfferTemplateUpdatePayload {
  name?: string;
  description?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  footerHtml?: string | null;
  websiteUrl?: string | null;
}

export interface OfferTemplateSectionUpsertPayload {
  sectionKey?: string | null;
  sectionName: string;
  order: number;
  tiptapJson: Record<string, unknown>;
  html: string;
}
