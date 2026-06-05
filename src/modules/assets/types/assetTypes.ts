export type AssetCategory = string;

export type AssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_MAINTENANCE'
  | 'PENDING_RETURN'
  | 'DAMAGED'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

export type OperationalCriticalityTier =
  | 'MISSION_CRITICAL'
  | 'BUSINESS_CRITICAL'
  | 'STANDARD';

export type AssetReplacementMode =
  | 'PERMANENT_REPLACEMENT'
  | 'TEMPORARY_BACKUP';

export type AssetCondition =
  | 'NEW'
  | 'GOOD'
  | 'FAIR'
  | 'DAMAGED'
  | 'NEEDS_REPAIR';

export type AssetMaintenanceType =
  | 'REPAIR'
  | 'SERVICE'
  | 'INSPECTION'
  | 'REPLACEMENT'
  | 'UPGRADE'
  | 'WARRANTY_CLAIM'
  | 'DAMAGE_CHECK';

export type AssetMaintenanceStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TicketMode = 'ASSET_ISSUE' | 'GENERAL_HELP_REQUEST';

export type HelpdeskCategory =
  | 'HR_QUERIES'
  | 'IT_SUPPORT'
  | 'FINANCE'
  | 'GENERAL';

export interface TicketAttachmentMetadata {
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  contentType?: string | null;
}

export type AssetReportType =
  | 'ALL_ASSETS'
  | 'AVAILABLE_ASSETS'
  | 'PROVIDED_ASSETS'
  | 'RETURNED_ASSETS'
  | 'DAMAGED_ASSETS'
  | 'MAINTENANCE_HISTORY'
  | 'EMPLOYEE_ASSET_REPORT'
  | 'OFFBOARDING_PENDING_RETURN';

export type CategoryFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';

export interface AssetIdDefinition {
  id: string;
  assetIdName: string;
  isActive: boolean;
}

export interface AssetCategoryDefinition {
  id: string;
  name: string;
  assetCode: string | null;
  description: string | null;
  isActive: boolean;
  fields: AssetCategoryFieldDefinition[];
}

export interface AvailableAssetGroup {
  groupKey: string;
  assetName: string;
  categoryName: string | null;
  categoryDefinitionId: string | null;
  assetCode: string;
  brand: string | null;
  model: string | null;
  availableQuantity: number;
}

export interface AssetIssueInput {
  memberId: string;
  groupKey: string;
  quantity: number;
  conditionWhileProviding: AssetCondition;
  providedByMemberId: string;
  notes: string;
}

export interface AssetIssueResponse {
  issuedAssetIds: string[];
  assignmentIds: string[];
}

export interface BulkAssetCreateInput {
  assetCode: string;
  name: string;
  categoryDefinitionId: string | null;
  brand: string | null;
  model: string | null;
  condition: AssetCondition;
  location: string;
  serialNumbers: string[];
  customFields: CustomFieldValueInput[];
}

export interface AssetCategoryFieldDefinition {
  id: string;
  categoryId: string;
  fieldName: string;
  fieldType: CategoryFieldType;
  fieldOptions: { options?: string[] } | null;
  isRequired: boolean;
  displayOrder: number;
}

export interface CustomFieldValueInput {
  fieldDefinitionId: string;
  value: string | null;
}

export interface CustomFieldValueResponse {
  fieldDefinitionId: string;
  fieldName: string;
  fieldType: string;
  value: string | null;
}

export interface AssetUnitInput {
  serialNumber: string | null;
}

export interface AssetUnitResponse {
  id: string;
  assetId: string;
  serialNumber: string | null;
  status: string;
  currentHolderMemberId: string | null;
  currentHolderName: string | null;
  condition: string | null;
}

export interface AssetUnitSummary {
  total: number;
  available: number;
  provided: number;
  underMaintenance: number;
  damaged: number;
}

export interface AssetSummary {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  categoryDefinitionId: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiryDate: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  location: string | null;
  notes: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  currentHolderMemberId: string | null;
  currentHolderName: string | null;
  currentHolderEmail: string | null;
  openMaintenanceCount: number;
  unitSummary: AssetUnitSummary | null;
  customFields: CustomFieldValueResponse[];
}

export interface AssetProvideRecordSummary {
  id: string;
  assetUnitId: string | null;
  memberId: string;
  memberName: string | null;
  memberEmail: string | null;
  providedByMemberId: string | null;
  providedByName: string | null;
  providedDate: string;
  conditionWhileProviding: AssetCondition;
  provideNotes: string | null;
  returnDate: string | null;
  returnedCondition: AssetCondition | null;
  receivedByMemberId: string | null;
  receivedByName: string | null;
  returnNotes: string | null;
  replacementAssignmentId: string | null;
  handoverRequestedAt: string | null;
  handoverCompletedAt: string | null;
  handoverConditionNotes: string | null;
}

export type EmployeeAssetState =
  | 'CURRENT_ASSIGNED'
  | 'RETURN_PENDING'
  | 'RETURNED_IN_REPAIR'
  | 'RETURNED';

export interface EmployeeAssetViewRecord extends AssetSummary {
  assignmentId: string;
  assetId: string;
  assetUnitId: string | null;
  providedDate: string;
  returnDate: string | null;
  returnedCondition: AssetCondition | null;
  returnNotes: string | null;
  handoverRequestedAt: string | null;
  handoverCompletedAt: string | null;
  handoverConditionNotes: string | null;
  replacementAssignmentId: string | null;
  employeeState: EmployeeAssetState;
  employeeStatusLabel: string;
}

export interface EmployeeAssetViewResponse {
  current: EmployeeAssetViewRecord[];
  previous: EmployeeAssetViewRecord[];
}

export interface AssetMaintenanceSummary {
  id: string;
  ticketId: string;
  ticketMode: TicketMode;
  assetId: string | null;
  assetUnitId: string | null;
  category: string | null;
  subject: string | null;
  attachmentsMetadata: TicketAttachmentMetadata[];
  maintenanceType: AssetMaintenanceType;
  issueDescription: string;
  serviceDate: string;
  expectedCompletionDate: string | null;
  estimatedDowntimeHours: number | null;
  operationalCriticalityTier: OperationalCriticalityTier | null;
  completedDate: string | null;
  cost: number | null;
  status: AssetMaintenanceStatus;
  conditionBeforeMaintenance: AssetCondition | null;
  conditionAfterMaintenance: AssetCondition | null;
  notes: string | null;
  replacementDecision: AssetReplacementMode | null;
  replacementAssetUnitId: string | null;
  loggedByMemberId: string | null;
  loggedByName: string | null;
}

export interface AssetDetail extends AssetSummary {
  activeProvision: AssetProvideRecordSummary | null;
  assetHistory: AssetProvideRecordSummary[];
  maintenanceHistory: AssetMaintenanceSummary[];
  units: AssetUnitResponse[];
}

export interface AssetListResponse {
  items: AssetSummary[];
  total: number;
  page: number;
  page_size: number;
  overdue_count: number;
}

export interface AssetLookupOption {
  id: string;
  label: string;
  email?: string | null;
}

export interface AssetMetaResponse {
  members: AssetLookupOption[];
  categories: AssetCategoryDefinition[];
  statuses: AssetStatus[];
  conditions: AssetCondition[];
  maintenanceTypes: AssetMaintenanceType[];
  maintenanceStatuses: AssetMaintenanceStatus[];
  ticketModes: TicketMode[];
  reportTypes: AssetReportType[];
}

export interface AssetFiltersState {
  search?: string;
  category?: AssetCategory;
  categoryDefinitionId?: string;
  status?: AssetStatus;
  currentHolderMemberId?: string;
  page: number;
  pageSize: number;
}

export interface SwapAvailabilityOption {
  mode: AssetReplacementMode;
  label: string;
  available: boolean;
  availableCount: number;
  assetUnitIds: string[];
  serialNumbers: string[];
  recommended: boolean;
}

export interface AssetSwapPreview {
  maintenanceId: string;
  assetId: string;
  assetUnitId: string | null;
  currentAssetStatus: AssetStatus;
  currentCondition: AssetCondition | null;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  brand: string | null;
  model: string | null;
  operationalCriticalityTier: OperationalCriticalityTier | null;
  estimatedDowntimeHours: number | null;
  requiresReplacementValidation: boolean;
  recommendedMode: AssetReplacementMode | null;
  reason: string;
  options: SwapAvailabilityOption[];
}

export interface AssetRevokeSwapInput {
  maintenanceId: string;
  replacementMode: AssetReplacementMode;
  replacementAssetUnitId: string;
  revokeStatus: 'IN_MAINTENANCE' | 'PENDING_RETURN';
  replacementConditionWhileProviding: AssetCondition;
  providedByMemberId?: string | null;
  notes?: string | null;
}

export interface AssetSwapExecutionResult {
  maintenanceId: string;
  revokedAssetId: string;
  revokedAssetUnitId: string | null;
  revokedStatus: AssetStatus;
  replacementAssetId: string;
  replacementAssetUnitId: string;
  replacementMode: AssetReplacementMode;
  assignmentId: string;
  assignedMemberId: string;
  assignedMemberName: string | null;
}
