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

export interface AssetSummary {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
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
}

export interface AssetProvideRecordSummary {
  id: string;
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
  categories: AssetCategory[];
  statuses: AssetStatus[];
  conditions: AssetCondition[];
  maintenanceTypes: AssetMaintenanceType[];
  maintenanceStatuses: AssetMaintenanceStatus[];
  reportTypes: AssetReportType[];
}

export interface AssetFiltersState {
  search?: string;
  category?: AssetCategory;
  status?: AssetStatus;
  currentHolderMemberId?: string;
  page: number;
  pageSize: number;
}
