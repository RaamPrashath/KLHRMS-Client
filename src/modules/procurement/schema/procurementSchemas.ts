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

export const procurementPurchaseOrderSchema = z.object({
  formatKey: z.literal(PROCUREMENT_PO_FORMATS[0]),
  recipientMemberId: z.string().min(1, 'Admin recipient is required'),
  recipientEmail: z.string().email('A valid admin email is required'),
  message: z.string().max(1000).optional().nullable(),
});

export type BulkProcurementInput = z.infer<typeof bulkProcurementSchema>;
export type ReplacementProcurementInput = z.infer<typeof replacementProcurementSchema>;
export type ProcurementDecisionInput = z.infer<typeof procurementDecisionSchema>;
export type ProcurementPurchaseOrderInput = z.infer<typeof procurementPurchaseOrderSchema>;
