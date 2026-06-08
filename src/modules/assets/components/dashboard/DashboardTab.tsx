'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CircleCheck,
  Package,
  Ticket,
  WrenchIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchAssetDetailAction } from '@/modules/assets/api/assetServerActions';
import { AssetDetailDialog } from '@/modules/assets/components/AssetDetailDialog';
import { readError } from '@/modules/assets/lib/assetUtils';
import type {
  AssetDetail,
  AssetProvideRecordSummary,
  AssetSummary,
  AssetUnitResponse,
} from '@/modules/assets/types/assetTypes';
import {
  useBrandModelAnalyticsQuery,
  useDashboardQuery,
  useOsDistributionQuery,
  useWarrantyFeedQuery,
} from '@/modules/assets/hooks/useDashboardQuery';
import { ActivityTable } from './ActivityTable';
import { BrandModelInventoryMatrix } from './BrandModelInventoryMatrix';
import { DashboardKPICard } from './DashboardKPICard';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { OpenTicketList } from './OpenTicketList';
import { OsDistributionCard } from './OsDistributionCard';
import { StatusDonutChart } from './StatusDonutChart';
import { UpcomingExpirationsFeed } from './UpcomingExpirationsFeed';
import type { BrandModelInventoryRow } from './dashboard.types';

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#e8e8eb] ${className ?? ''}`} />;
}

function deriveAggregateStatus(row: BrandModelInventoryRow): AssetSummary['status'] {
  if (row.inOfficeStock > 0) return 'AVAILABLE';
  if (row.providedStock > 0) return 'ASSIGNED';
  if (row.maintenanceOrDamagedStock > 0) return 'IN_MAINTENANCE';
  return 'AVAILABLE';
}

function sortByNewest<T extends { providedDate?: string | null; serviceDate?: string | null; createdAt?: string | null }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftDate = left.providedDate || left.serviceDate || left.createdAt || '';
    const rightDate = right.providedDate || right.serviceDate || right.createdAt || '';
    return rightDate.localeCompare(leftDate);
  });
}

function buildAggregateDetail(row: BrandModelInventoryRow, details: AssetDetail[]): AssetDetail {
  const unitIds = new Set(row.unitIds);
  const serialNumbers = new Set(row.serialNumbers);

  const units: AssetUnitResponse[] = [];
  const assetHistory: AssetProvideRecordSummary[] = [];
  const maintenanceHistory: AssetDetail['maintenanceHistory'] = [];

  for (const detail of details) {
    if (detail.units.length > 0) {
      units.push(
        ...detail.units.filter(
          (unit) =>
            unitIds.has(unit.id) || (unit.serialNumber ? serialNumbers.has(unit.serialNumber) : false),
        ),
      );
    } else if (detail.serialNumber && serialNumbers.has(detail.serialNumber)) {
      units.push({
        id: `${detail.id}:implicit`,
        assetId: detail.id,
        serialNumber: detail.serialNumber,
        status: detail.status,
        currentHolderMemberId: detail.currentHolderMemberId,
        currentHolderName: detail.currentHolderName,
        condition: detail.condition,
      });
    }

    assetHistory.push(
      ...detail.assetHistory.filter((record) => {
        if (unitIds.size === 0) return true;
        return record.assetUnitId ? unitIds.has(record.assetUnitId) : detail.units.length <= 1;
      }),
    );

    maintenanceHistory.push(
      ...detail.maintenanceHistory.filter((record) => {
        if (unitIds.size === 0) return true;
        return record.assetUnitId ? unitIds.has(record.assetUnitId) : detail.units.length <= 1;
      }),
    );
  }

  const newestDetail = details[0];
  const activeProvision = assetHistory.find((record) => record.returnDate === null) ?? null;

  return {
    id: `brand-model:${row.rowKey}`,
    assetCode: `${row.brand.toUpperCase()}-${row.model.toUpperCase().replaceAll(' ', '-')}`,
    name: `${row.brand} ${row.model}`,
    category: 'LAPTOP',
    categoryDefinitionId: newestDetail?.categoryDefinitionId ?? null,
    serialNumber: units[0]?.serialNumber ?? null,
    brand: row.brand,
    model: row.model,
    purchaseDate: null,
    purchasePrice: null,
    warrantyExpiryDate: null,
    condition: newestDetail?.condition ?? 'GOOD',
    status: deriveAggregateStatus(row),
    location: newestDetail?.location ?? 'Multiple locations',
    notes: `Filtered laptop inventory view for ${row.brand} ${row.model}`,
    quantity: row.totalStock,
    createdAt: newestDetail?.createdAt ?? new Date().toISOString(),
    updatedAt: newestDetail?.updatedAt ?? new Date().toISOString(),
    currentHolderMemberId: activeProvision?.memberId ?? null,
    currentHolderName: activeProvision?.memberName ?? null,
    currentHolderEmail: activeProvision?.memberEmail ?? null,
    openMaintenanceCount: maintenanceHistory.filter((record) =>
      ['OPEN', 'IN_PROGRESS'].includes(record.status),
    ).length,
    unitSummary: {
      total: row.totalStock,
      available: row.inOfficeStock,
      provided: row.providedStock,
      underMaintenance: row.maintenanceOrDamagedStock,
      damaged: row.maintenanceOrDamagedStock,
    },
    customFields: [],
    activeProvision,
    assetHistory: sortByNewest(assetHistory),
    maintenanceHistory: sortByNewest(maintenanceHistory),
    units,
  };
}

export function DashboardTab({
  orgSlug,
  memberId,
  canManageAssets,
}: {
  orgSlug: string;
  memberId: string;
  canManageAssets: boolean;
}) {
  const { data, isLoading, isError } = useDashboardQuery(orgSlug, memberId);
  const brandModelQuery = useBrandModelAnalyticsQuery(orgSlug, memberId);
  const osDistributionQuery = useOsDistributionQuery(orgSlug, memberId);
  const warrantyFeedQuery = useWarrantyFeedQuery(orgSlug, memberId);
  const queryClient = useQueryClient();

  const [selectedBreakdown, setSelectedBreakdown] = useState<AssetDetail | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [loadingRowKey, setLoadingRowKey] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<'assigned' | 'maintenance'>('assigned');

  useEffect(() => {
    if (brandModelQuery.data) {
      console.info(
        '[Assets] Temporary Laptop Stock depth:',
        brandModelQuery.data.temporaryLaptopStockDepth,
      );
    }
  }, [brandModelQuery.data]);

  async function handleBreakdownRowClick(row: BrandModelInventoryRow) {
    setLoadingRowKey(row.rowKey);
    try {
      const details = await Promise.all(
        row.assetIds.map((assetId) =>
          queryClient.fetchQuery({
            queryKey: ['asset', orgSlug, assetId],
            queryFn: () => fetchAssetDetailAction({ orgSlug, memberId, assetId }),
            staleTime: 1000 * 60,
          }),
        ),
      );
      setSelectedBreakdown(buildAggregateDetail(row, details));
      setIsBreakdownOpen(true);
    } catch (error) {
      toast.error(readError(error, 'Failed to load brand and model inventory details'));
    } finally {
      setLoadingRowKey(null);
    }
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
          <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load dashboard</p>
          <p className="mt-0.5 text-[13px] text-[#6e6e73]">Try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
              <SkeletonLine className="mb-2 h-7 w-16" />
              <SkeletonLine className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
            <SkeletonLine className="mb-4 h-5 w-36" />
            <SkeletonLine className="h-40 w-full" />
          </div>
          <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
            <SkeletonLine className="mb-4 h-5 w-36" />
            <SkeletonLine className="h-40 w-full" />
          </div>
        </div>
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
          <SkeletonLine className="mb-4 h-5 w-48" />
          <SkeletonLine className="h-52 w-full" />
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 rounded-[18px] border border-[#e5e7eb] bg-white p-5">
            <SkeletonLine className="mb-4 h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonLine className="size-7 rounded-lg" />
                  <SkeletonLine className="h-4 flex-1" />
                  <SkeletonLine className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-5">
            <SkeletonLine className="mb-4 h-5 w-28" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <SkeletonLine className="mt-1 size-2.5 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonLine className="h-4 w-32" />
                    <SkeletonLine className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const d = data!;

  const assignedActivity = d.recentActivity.filter(
    (item) => item.type === 'ASSIGNED' || item.type === 'RETURNED',
  );
  const maintenanceActivity = d.recentActivity.filter((item) => item.type === 'MAINTENANCE');
  const filteredActivity = activityTab === 'assigned' ? assignedActivity : maintenanceActivity;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <DashboardKPICard value={d.totalAssets} label="Total Assets" icon={Package} color="#6b7280" />
        <DashboardKPICard value={d.availableCount} label="Available" icon={CircleCheck} color="var(--indigo-9)" />
        <DashboardKPICard value={d.providedCount} label="Issued" icon={UserCheckIcon} color="#2563eb" />
        <DashboardKPICard value={d.maintenanceCount} label="In Maintenance" icon={WrenchIcon} color="#d97706" />
        <DashboardKPICard value={d.openTicketCount} label="Open Tickets" icon={Ticket} color="#dc2626" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Status Distribution
          </h3>
          <StatusDonutChart data={d.statusDistribution} />
        </div>
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Monthly Additions
          </h3>
          <MonthlyTrendChart data={d.monthlyTrends} />
        </div>
      </div>

      <BrandModelInventoryMatrix
        analytics={brandModelQuery.data}
        isLoading={brandModelQuery.isLoading}
        activeRowKey={loadingRowKey}
        onRowClick={handleBreakdownRowClick}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <OsDistributionCard
          data={osDistributionQuery.data}
          isLoading={osDistributionQuery.isLoading}
          isError={osDistributionQuery.isError}
        />
        <UpcomingExpirationsFeed
          data={warrantyFeedQuery.data}
          isLoading={warrantyFeedQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
              Recent Activity
            </h3>
            <div className="flex items-center gap-0.5 rounded-lg bg-[#f5f5f7] p-0.5">
              <button
                type="button"
                onClick={() => setActivityTab('assigned')}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activityTab === 'assigned'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                Assigned
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('maintenance')}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activityTab === 'maintenance'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                Maintenance
              </button>
            </div>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <ActivityTable items={filteredActivity} />
          </div>
        </div>
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Open Tickets
          </h3>
          <OpenTicketList tickets={d.recentTickets} />
        </div>
      </div>

      <AssetDetailDialog
        open={isBreakdownOpen}
        onOpenChange={(open) => {
          setIsBreakdownOpen(open);
          if (!open) setSelectedBreakdown(null);
        }}
        isLoading={loadingRowKey !== null && !selectedBreakdown}
        asset={selectedBreakdown ?? undefined}
        canManageAssets={canManageAssets}
        hideActions
        titleOverride={selectedBreakdown?.name}
        onEdit={() => {}}
        onArchive={() => {}}
        onProvide={() => {}}
        onReturn={() => {}}
        onMaintenance={() => {}}
      />
    </div>
  );
}

function UserCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
