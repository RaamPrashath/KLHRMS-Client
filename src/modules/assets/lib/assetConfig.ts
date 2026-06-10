import type { ElementType } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  ClipboardList,
  DoorOpen,
  Hammer,
  LaptopMinimal,
  LayoutDashboard,
  LayoutGrid,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  RotateCw,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react';
import type {
  AssetInput,
  AssetMaintenanceCreateInput,
  AssetMaintenanceUpdateInput,
  AssetReturnInput,
  BulkAssetCreateInput,
} from '@/modules/assets/schema/assetSchemas';
import type { AssetMaintenanceSummary, AssetReportType } from '@/modules/assets/types/assetTypes';

export const ACTION_GREEN = 'var(--indigo-9)';

export type AssetTabValue = 'dashboard' | 'register' | 'categories' | 'provide' | 'returned' | 'access-control' | 'inventory';

const ASSET_TABS: Array<{
  value: AssetTabValue;
  label: string;
  icon: ElementType;
}> = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'register', label: 'Asset Register', icon: LaptopMinimal },
  { value: 'categories', label: 'Categories', icon: LayoutGrid },
  { value: 'provide', label: 'Issue Asset', icon: PackagePlus },
  { value: 'returned', label: 'Returned Assets', icon: RotateCw },
  { value: 'access-control', label: 'Access Control', icon: DoorOpen },
  { value: 'inventory', label: 'Inventory', icon: ClipboardList },
];

export function getAssetTabOptions(canManage: boolean) {
  if (canManage) return ASSET_TABS;
  return [];
}

export const ASSET_TAB_OPTIONS = getAssetTabOptions(true);

export const REPORT_GROUPS: Array<{
  label: string;
  icon: ElementType;
  types: AssetReportType[];
}> = [
  {
    label: 'Register',
    icon: ClipboardList,
    types: ['ALL_ASSETS', 'AVAILABLE_ASSETS', 'PROVIDED_ASSETS', 'DAMAGED_ASSETS'],
  },
  {
    label: 'Activity',
    icon: ArrowLeftRight,
    types: ['RETURNED_ASSETS', 'MAINTENANCE_HISTORY'],
  },
  {
    label: 'Employee',
    icon: Users,
    types: ['EMPLOYEE_ASSET_REPORT', 'OFFBOARDING_PENDING_RETURN'],
  },
];

export const REPORT_TYPE_ICONS: Record<AssetReportType, ElementType> = {
  ALL_ASSETS: Archive,
  AVAILABLE_ASSETS: PackageCheck,
  PROVIDED_ASSETS: UserCircle,
  DAMAGED_ASSETS: AlertTriangle,
  RETURNED_ASSETS: ArrowLeftRight,
  MAINTENANCE_HISTORY: Wrench,
  EMPLOYEE_ASSET_REPORT: Users,
  OFFBOARDING_PENDING_RETURN: ClipboardList,
};

export const defaultAssetForm: AssetInput = {
  assetCode: '',
  name: '',
  category: 'OTHER',
  categoryDefinitionId: null,
  serialNumber: '',
  brand: '',
  model: '',
  purchaseDate: '',
  purchasePrice: null,
  warrantyExpiryDate: '',
  condition: 'GOOD',
  status: 'AVAILABLE',
  location: '',
  quantity: 1,
  customFields: [],
  units: [],
};

export const defaultBulkAssetForm: BulkAssetCreateInput = {
  assetCode: '',
  name: '',
  categoryDefinitionId: null,
  brand: '',
  condition: 'GOOD',
  location: '',
  serialNumbers: [''],
  customFields: [],
};

export function createReturnForm(memberId: string): AssetReturnInput {
  return {
    memberId: '',
    assetId: '',
    assetUnitId: null,
    returnDate: '',
    returnedCondition: 'GOOD',
    receivedByMemberId: memberId,
    returnNotes: '',
    nextStatus: 'AVAILABLE',
  };
}

export function createMaintenanceForm(): AssetMaintenanceCreateInput {
  return {
    assetId: '',
    assetUnitId: null,
    maintenanceType: 'REPAIR',
    issueDescription: '',
    serviceDate: '',
    expectedCompletionDate: '',
    cost: null,
    status: 'OPEN',
    conditionBeforeMaintenance: 'GOOD',
    operationalCriticalityTier: 'STANDARD',
    notes: '',
  };
}

export function createMaintenanceUpdateForm(log: AssetMaintenanceSummary): AssetMaintenanceUpdateInput {
  return {
    maintenanceId: log.id,
    status: 'COMPLETED',
    expectedCompletionDate: log.expectedCompletionDate ?? '',
    completedDate: '',
    conditionAfterMaintenance: log.conditionBeforeMaintenance ?? 'GOOD',
    nextAssetStatus: 'AVAILABLE',
    notes: log.notes ?? '',
  };
}
