import type { ElementType } from 'react';
import { BarChart3, Hammer, LaptopMinimal, PackagePlus, RotateCcw } from 'lucide-react';
import type {
  AssetInput,
  AssetMaintenanceCreateInput,
  AssetMaintenanceUpdateInput,
  AssetProvideInput,
  AssetReturnInput,
} from '@/modules/assets/schema/assetSchemas';
import type { AssetMaintenanceSummary, AssetReportType } from '@/modules/assets/types/assetTypes';

export const ACTION_GREEN = '#00874a';

export type AssetTabValue = 'register' | 'provide' | 'returns' | 'maintenance' | 'reports';

export const ASSET_TAB_OPTIONS: Array<{
  value: AssetTabValue;
  label: string;
  icon: ElementType;
}> = [
  { value: 'register', label: 'Asset Register', icon: LaptopMinimal },
  { value: 'provide', label: 'Provide Asset', icon: PackagePlus },
  { value: 'returns', label: 'Returns', icon: RotateCcw },
  { value: 'maintenance', label: 'Maintenance', icon: Hammer },
  { value: 'reports', label: 'Reports', icon: BarChart3 },
];

export const REPORT_CARDS: AssetReportType[] = ['ALL_ASSETS', 'AVAILABLE_ASSETS', 'MAINTENANCE_HISTORY'];

export const defaultAssetForm: AssetInput = {
  assetCode: '',
  name: '',
  category: 'OTHER',
  serialNumber: '',
  model: '',
  purchaseDate: '',
  purchasePrice: null,
  warrantyExpiryDate: '',
  condition: 'GOOD',
  status: 'AVAILABLE',
  location: '',
  quantity: 1,
};

export function createProvideForm(memberId: string): AssetProvideInput {
  return {
    memberId: '',
    assetId: '',
    providedDate: '',
    conditionWhileProviding: 'GOOD',
    providedByMemberId: memberId,
    notes: '',
  };
}

export function createReturnForm(memberId: string): AssetReturnInput {
  return {
    memberId: '',
    assetId: '',
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
    maintenanceType: 'REPAIR',
    issueDescription: '',
    serviceDate: '',
    expectedCompletionDate: '',
    cost: null,
    status: 'OPEN',
    conditionBeforeMaintenance: 'GOOD',
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
