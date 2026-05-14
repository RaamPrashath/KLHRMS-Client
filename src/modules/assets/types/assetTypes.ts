export type AssetCategory =
  | 'ELECTRONICS'
  | 'ID_CARD'
  | 'OTHER';

export type AssetStatus =
  | 'AVAILABLE'
  | 'PROVIDED'
  | 'UNDER_MAINTENANCE'
  | 'DAMAGED'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

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
  description: string | null;
  isActive: boolean;
  fields: AssetCategoryFieldDefinition[];
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
}

export interface AssetMaintenanceSummary {
  id: string;
  assetUnitId: string | null;
  maintenanceType: AssetMaintenanceType;
  issueDescription: string;
  serviceDate: string;
  expectedCompletionDate: string | null;
  completedDate: string | null;
  cost: number | null;
  status: AssetMaintenanceStatus;
  conditionBeforeMaintenance: AssetCondition | null;
  conditionAfterMaintenance: AssetCondition | null;
  notes: string | null;
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
