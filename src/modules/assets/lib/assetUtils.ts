import { format } from 'date-fns';
import type { AssetCondition, AssetReportType, AssetStatus } from '@/modules/assets/types/assetTypes';

export function readError(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '{}');
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

export function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return format(new Date(value), 'MMM d, yyyy');
}

export function formatCurrency(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function statusBadge(status: AssetStatus) {
  const map: Record<AssetStatus, string> = {
    AVAILABLE: 'bg-[#eef9f1] text-[#156f3d]',
    PROVIDED: 'bg-[#eef5ff] text-[#2454a6]',
    UNDER_MAINTENANCE: 'bg-[#fff7e8] text-[#8a5a00]',
    DAMAGED: 'bg-[#fff1f1] text-[#b3261e]',
    LOST: 'bg-[#fff4e5] text-[#965400]',
    RETIRED: 'bg-[#f3f4f6] text-[#5b6470]',
    DISPOSED: 'bg-[#efeff1] text-[#50545d]',
  };
  return map[status];
}

export function conditionBadge(condition: AssetCondition) {
  const map: Record<AssetCondition, string> = {
    NEW: 'bg-[#eef5ff] text-[#2454a6]',
    GOOD: 'bg-[#eef9f1] text-[#156f3d]',
    FAIR: 'bg-[#fff7e8] text-[#8a5a00]',
    DAMAGED: 'bg-[#fff1f1] text-[#b3261e]',
    NEEDS_REPAIR: 'bg-[#fff4e5] text-[#965400]',
  };
  return map[condition];
}

export function reportDescriptions(type: AssetReportType) {
  const map: Record<AssetReportType, string> = {
    ALL_ASSETS: 'Full company asset register with current holder and location.',
    AVAILABLE_ASSETS: 'Assets ready to be provided to employees.',
    PROVIDED_ASSETS: 'Assets currently with employees.',
    RETURNED_ASSETS: 'Completed return history for audit review.',
    DAMAGED_ASSETS: 'Assets flagged as damaged and pending action.',
    MAINTENANCE_HISTORY: 'Maintenance timeline with cost and service details.',
    EMPLOYEE_ASSET_REPORT: 'Asset history for a selected employee.',
    OFFBOARDING_PENDING_RETURN: 'Overdue and pending returns for offboarding follow-up.',
  };
  return map[type];
}

export function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function deriveReturnNextStatus(condition: AssetCondition) {
  return condition === 'NEW' || condition === 'GOOD' || condition === 'FAIR'
    ? 'AVAILABLE'
    : 'UNDER_MAINTENANCE';
}

export function getRowActions(status: AssetStatus) {
  if (status === 'AVAILABLE') return ['View', 'Edit', 'Provide Asset', 'Log Maintenance', 'Decommission'];
  if (status === 'PROVIDED') return ['View', 'Return Asset', 'Log Maintenance'];
  if (status === 'UNDER_MAINTENANCE') return ['View'];
  if (status === 'DAMAGED') return ['View', 'Log Maintenance', 'Decommission'];
  return ['View'];
}
