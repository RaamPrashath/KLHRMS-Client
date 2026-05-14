import { z } from 'zod';

export const assetCategoryOptions = [
  'ELECTRONICS',
  'ID_CARD',
  'OTHER',
] as const;

export const assetStatusOptions = [
  'AVAILABLE',
  'PROVIDED',
  'UNDER_MAINTENANCE',
  'DAMAGED',
  'LOST',
  'RETIRED',
  'DISPOSED',
] as const;

export const assetConditionOptions = [
  'NEW',
  'GOOD',
  'FAIR',
  'DAMAGED',
  'NEEDS_REPAIR',
] as const;

export const assetMaintenanceTypeOptions = [
  'REPAIR',
  'SERVICE',
  'INSPECTION',
  'REPLACEMENT',
  'UPGRADE',
  'WARRANTY_CLAIM',
  'DAMAGE_CHECK',
] as const;

export const assetMaintenanceStatusOptions = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export const assetReportTypeOptions = [
  'ALL_ASSETS',
  'AVAILABLE_ASSETS',
  'PROVIDED_ASSETS',
  'RETURNED_ASSETS',
  'DAMAGED_ASSETS',
  'MAINTENANCE_HISTORY',
  'EMPLOYEE_ASSET_REPORT',
  'OFFBOARDING_PENDING_RETURN',
] as const;

export const categoryFieldTypeOptions = [
  'TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'SELECT',
] as const;

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const customFieldValueSchema = z.object({
  fieldDefinitionId: z.string().min(1),
  value: z.string().nullable().optional(),
});

const assetUnitInputSchema = z.object({
  serialNumber: z.string().nullable().optional(),
});

export const assetSchema = z
  .object({
    assetCode: z.string().trim().min(1, 'Asset code / Tag ID is required').max(120),
    name: z.string().trim().min(1, 'Asset name is required').max(255),
    category: z.enum(assetCategoryOptions),
    categoryDefinitionId: z.string().optional().nullable(),
    serialNumber: optionalTrimmedString(255),
    model: optionalTrimmedString(120),
    purchaseDate: z.string().optional().or(z.literal('')),
    purchasePrice: z.coerce.number().min(0, 'Purchase price must be 0 or more').nullable().optional(),
    warrantyExpiryDate: z.string().optional().or(z.literal('')),
    condition: z.enum(assetConditionOptions),
    status: z.enum(assetStatusOptions),
    location: optionalTrimmedString(160),
    quantity: z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
    customFields: z.array(customFieldValueSchema).optional().default([]),
    units: z.array(assetUnitInputSchema).optional().default([]),
  })
  .refine(
    (data) =>
      !(data.purchaseDate && data.warrantyExpiryDate) ||
      new Date(data.warrantyExpiryDate) >= new Date(data.purchaseDate),
    {
      message: 'Warranty expiry date must be on or after the purchase date',
      path: ['warrantyExpiryDate'],
    },
  );

export const assetProvideSchema = z.object({
  memberId: z.string().min(1, 'Employee is required'),
  assetId: z.string().min(1, 'Asset is required'),
  assetUnitId: z.string().optional().nullable(),
  providedDate: z.string().optional().or(z.literal('')),
  conditionWhileProviding: z.enum(assetConditionOptions),
  providedByMemberId: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export const assetReturnSchema = z.object({
  memberId: z.string().min(1, 'Employee is required'),
  assetId: z.string().min(1, 'Asset is required'),
  assetUnitId: z.string().optional().nullable(),
  returnDate: z.string().optional().or(z.literal('')),
  returnedCondition: z.enum(assetConditionOptions),
  receivedByMemberId: z.string().optional().or(z.literal('')),
  returnNotes: z.string().optional().or(z.literal('')),
  nextStatus: z.enum(['AVAILABLE', 'UNDER_MAINTENANCE', 'DAMAGED', 'RETIRED', 'DISPOSED']).optional().nullable(),
});

export const assetMaintenanceCreateSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  assetUnitId: z.string().optional().nullable(),
  maintenanceType: z.enum(assetMaintenanceTypeOptions),
  issueDescription: z.string().trim().min(1, 'Issue description is required'),
  serviceDate: z.string().min(1, 'Service date is required'),
  expectedCompletionDate: z.string().optional().or(z.literal('')),
  cost: z.coerce.number().min(0, 'Cost must be 0 or more').nullable().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS']),
  conditionBeforeMaintenance: z.enum(assetConditionOptions).optional().nullable(),
  notes: z.string().optional().or(z.literal('')),
});

export const assetMaintenanceUpdateSchema = z
  .object({
    maintenanceId: z.string().min(1, 'Maintenance record is required'),
    status: z.enum(assetMaintenanceStatusOptions),
    expectedCompletionDate: z.string().optional().or(z.literal('')),
    completedDate: z.string().optional().or(z.literal('')),
    conditionAfterMaintenance: z.enum(assetConditionOptions).optional().nullable(),
    nextAssetStatus: z
      .enum(['AVAILABLE', 'UNDER_MAINTENANCE', 'DAMAGED', 'RETIRED', 'DISPOSED'])
      .optional()
      .nullable(),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'COMPLETED' && !data.completedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completedDate'],
        message: 'Completed date is required when maintenance is completed',
      });
    }

    if (data.status === 'COMPLETED' && !data.nextAssetStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nextAssetStatus'],
        message: 'Choose the next asset status when maintenance is completed',
      });
    }
  });

// Category schemas
export const assetCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().optional().or(z.literal('')),
});

export const assetCategoryFieldCreateSchema = z.object({
  fieldName: z.string().trim().min(1, 'Field name is required').max(100),
  fieldType: z.enum(categoryFieldTypeOptions),
  fieldOptions: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const assetCategoryFieldUpdateSchema = z.object({
  fieldName: z.string().trim().min(1).max(100).optional(),
  fieldType: z.enum(categoryFieldTypeOptions).optional(),
  fieldOptions: z.array(z.string()).optional().nullable(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type AssetProvideInput = z.infer<typeof assetProvideSchema>;
export type AssetReturnInput = z.infer<typeof assetReturnSchema>;
export type AssetMaintenanceCreateInput = z.infer<typeof assetMaintenanceCreateSchema>;
export type AssetMaintenanceUpdateInput = z.infer<typeof assetMaintenanceUpdateSchema>;
export type AssetCategoryCreateInput = z.infer<typeof assetCategoryCreateSchema>;
export type AssetCategoryFieldCreateInput = z.infer<typeof assetCategoryFieldCreateSchema>;
export type AssetCategoryFieldUpdateInput = z.infer<typeof assetCategoryFieldUpdateSchema>;
