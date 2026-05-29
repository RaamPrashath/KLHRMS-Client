import { z } from 'zod';
import {
  PROCUREMENT_PO_FORMATS,
  PROCUREMENT_REQUEST_TYPES,
  PROCUREMENT_URGENCY,
} from '@/modules/procurement/types/procurementTypes';

export const bulkProcurementSchema = z.object({
  requestType: z.literal(PROCUREMENT_REQUEST_TYPES[0]),
  assetName: z.string().min(1, 'Asset name is required'),
  assetCode: z.string().optional().nullable(),
  categoryDefinitionId: z.string().optional().nullable(),
  estimatedQuantity: z.number().int().min(1, 'Quantity is required'),
  estimatedUnitCost: z.number().min(0).nullable().optional(),
  estimatedTotalCost: z.number().min(0).nullable().optional(),
  requiredByDate: z.string().optional().nullable(),
  costCenterOrDepartmentId: z.string().optional().nullable(),
  vendorPreference: z.string().optional().nullable(),
  urgency: z.enum(PROCUREMENT_URGENCY).nullable().optional(),
  justification: z.string().min(1, 'Justification is required'),
  specificationNotes: z.string().optional().nullable(),
});

export const replacementProcurementSchema = z.object({
  requestType: z.literal(PROCUREMENT_REQUEST_TYPES[1]),
  maintenanceTicketId: z.string().min(1, 'Ticket is required'),
  estimatedUnitCost: z.number().min(0).nullable().optional(),
  estimatedTotalCost: z.number().min(0).nullable().optional(),
  requiredByDate: z.string().optional().nullable(),
  costCenterOrDepartmentId: z.string().optional().nullable(),
  vendorPreference: z.string().optional().nullable(),
  urgency: z.enum(PROCUREMENT_URGENCY).nullable().optional(),
  justification: z.string().min(1, 'Financial justification is required'),
  replacementReason: z.string().min(1, 'Replacement reason is required'),
});

export const procurementDecisionSchema = z.object({
  comment: z.string().optional().nullable(),
});

const richTextHtmlSchema = z.string().optional().nullable();

export const procurementPurchaseOrderSchema = z.object({
  formatKey: z.literal(PROCUREMENT_PO_FORMATS[0]),
  template: z.object({
    name: z.string().min(1, 'Template name is required'),
    pageSize: z.enum(['A4', 'LETTER']),
    locale: z.string().min(2, 'Locale is required'),
    language: z.string().min(2, 'Language is required'),
    headerTitle: z.string().min(1, 'Header title is required'),
    headerSubtitle: z.string().optional().nullable(),
    headerRichText: richTextHtmlSchema,
    footerRichText: richTextHtmlSchema,
    company: z.object({
      displayName: z.string().min(1, 'Display name is required'),
      name: z.string().min(1, 'Company name is required'),
      logoUrl: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      contactEmail: z.string().optional().nullable(),
      contactPhone: z.string().optional().nullable(),
      taxId: z.string().optional().nullable(),
    }),
    signatory: z.object({
      name: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      signatureImageUrl: z.string().optional().nullable(),
    }),
    visibility: z.object({
      showLogo: z.boolean(),
      showVendorContact: z.boolean(),
      showVendorAddress: z.boolean(),
      showBillingAddress: z.boolean(),
      showShippingAddress: z.boolean(),
      showSubject: z.boolean(),
      showPaymentTerms: z.boolean(),
      showNotes: z.boolean(),
      showTerms: z.boolean(),
      showFooter: z.boolean(),
      showSignature: z.boolean(),
    }),
    defaultPaymentTermsHtml: richTextHtmlSchema,
    defaultNotesHtml: richTextHtmlSchema,
    defaultTermsHtml: richTextHtmlSchema,
  }),
  document: z.object({
    document: z.object({
      vendor: z.object({
        name: z.string().min(1, 'Vendor name is required'),
        contactPerson: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        taxId: z.string().optional().nullable(),
      }),
      purchaseOrderDate: z.string().min(1, 'Purchase order date is required'),
      deliveryDate: z.string().optional().nullable(),
      billingAddress: z.string().optional().nullable(),
      shippingAddress: z.string().optional().nullable(),
      shippingMethod: z.string().optional().nullable(),
      currency: z.string().min(3, 'Currency is required'),
      subject: z.string().optional().nullable(),
      paymentTermsHtml: richTextHtmlSchema,
      notesHtml: richTextHtmlSchema,
      termsHtml: richTextHtmlSchema,
      footerNotesHtml: richTextHtmlSchema,
    }),
    lineItems: z.array(
      z.object({
        description: z.string().min(1, 'Item description is required'),
        sku: z.string().optional().nullable(),
        quantity: z.number().int().min(1, 'Quantity is required'),
        unitPrice: z.number().min(0, 'Unit price must be positive'),
        taxPercent: z.number().min(0).max(100),
        total: z.number().min(0, 'Total must be positive'),
      }),
    ).min(1, 'At least one line item is required'),
  }),
  recipientMemberId: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
  sendToAdmin: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.sendToAdmin && !value.recipientMemberId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipientMemberId'],
      message: 'Admin recipient is required',
    });
  }
  if (value.sendToAdmin && !value.recipientEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipientEmail'],
      message: 'A valid admin email is required',
    });
  }
});

export const procurementPurchaseOrderTemplateSchema = procurementPurchaseOrderSchema.shape.template;

export type BulkProcurementInput = z.infer<typeof bulkProcurementSchema>;
export type ReplacementProcurementInput = z.infer<typeof replacementProcurementSchema>;
export type ProcurementDecisionInput = z.infer<typeof procurementDecisionSchema>;
export type ProcurementPurchaseOrderInput = z.infer<typeof procurementPurchaseOrderSchema>;
export type ProcurementPurchaseOrderTemplateInput = z.infer<typeof procurementPurchaseOrderTemplateSchema>;
