'use client';

import { Archive, Hammer, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActionButton,
  DetailField,
  EmptyState,
  HistorySection,
  TimelineCard,
} from '@/modules/assets/components/assetsPagePrimitives';
import { conditionBadge, formatCurrency, formatDate, getRowActions, humanize, statusBadge } from '@/modules/assets/components/assetsPageUtils';
import type { AssetDetail, AssetMaintenanceSummary, AssetSummary } from '@/modules/assets/types/assetTypes';

export function AssetDetailDialog({
  open,
  onOpenChange,
  isLoading,
  asset,
  canManageAssets,
  onEdit,
  onArchive,
  onProvide,
  onReturn,
  onMaintenance,
  onCompleteMaintenance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  asset?: AssetDetail;
  canManageAssets: boolean;
  onEdit: (asset: AssetSummary | AssetDetail) => void;
  onArchive: (assetId: string) => void;
  onProvide: (asset: AssetSummary) => void;
  onReturn: (asset: AssetSummary) => void;
  onMaintenance: (asset: AssetSummary) => void;
  onCompleteMaintenance: (assetId: string, log: AssetMaintenanceSummary) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw]! max-w-270! overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white p-0">
        {isLoading && !asset ? (
          <div className="space-y-4 px-8 py-8">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        ) : !asset ? (
          <div className="px-8 py-10 text-[15px] text-[#6b7280]">Unable to load asset details.</div>
        ) : (
          <div className="flex max-h-[86vh] flex-col">
            <DialogHeader className="border-b border-[#eef0f3] px-8 py-6 text-left">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                    Asset Detail
                  </p>
                  <DialogTitle className="mt-1 text-[30px] font-semibold tracking-[-0.03em] text-[#111827]">
                    {asset.name}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-[15px] leading-6 text-[#6b7280]">
                    {asset.assetCode}
                    {asset.serialNumber ? ` · ${asset.serialNumber}` : ''}
                    {asset.location ? ` · ${asset.location}` : ''}
                  </DialogDescription>
                </div>
                <Badge
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadge(asset.status)}`}
                >
                  {humanize(asset.status)}
                </Badge>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto px-8 py-6">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
                    <p className="text-[16px] font-medium text-[#111827]">Asset Snapshot</p>
                    <div className="mt-4 grid gap-3">
                      <DetailField label="Category" value={humanize(asset.category)} />
                      <DetailField label="Condition" value={humanize(asset.condition)} />
                      <DetailField label="Model" value={asset.model || 'Not recorded'} />
                      <DetailField label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                      <DetailField label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                      <DetailField label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
                      <DetailField label="Location" value={asset.location || 'Not recorded'} />
                      <DetailField label="Current Holder" value={asset.currentHolderName || 'In register'} />
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
                    <p className="text-[16px] font-medium text-[#111827]">Actions</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {getRowActions(asset.status)
                        .filter((action) => action !== 'View' && action !== 'Retire')
                        .map((action) => (
                          <ActionButton
                            key={action}
                            label={action}
                            onClick={() => {
                              if (action === 'Edit') onEdit(asset);
                              if (action === 'Provide Asset') onProvide(asset);
                              if (action === 'Return Asset') onReturn(asset);
                              if (action === 'Log Maintenance') onMaintenance(asset);
                              if (action === 'Complete Maintenance') {
                                const openLog = asset.maintenanceHistory.find(
                                  (log) => log.status === 'OPEN' || log.status === 'IN_PROGRESS',
                                );
                                if (openLog) onCompleteMaintenance(asset.id, openLog);
                              }
                            }}
                          />
                        ))}
                      {asset.status === 'UNDER_MAINTENANCE' &&
                        asset.maintenanceHistory
                          .filter((log) => log.status === 'OPEN' || log.status === 'IN_PROGRESS')
                          .slice(0, 1)
                          .map((log) => (
                            <ActionButton
                              key={log.id}
                              label="Complete Maintenance"
                              onClick={() => onCompleteMaintenance(asset.id, log)}
                            />
                          ))}
                      {canManageAssets && asset.status !== 'PROVIDED' && (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#d8dde5] px-4 text-[12px]"
                          onClick={() => onArchive(asset.id)}
                        >
                          <Archive className="mr-2 size-3.5" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <HistorySection title="Asset History" icon={<History className="size-4" />}>
                    {asset.assetHistory.length === 0 ? (
                      <EmptyState
                        icon={<History className="size-5" />}
                        title="No asset history yet"
                        description="Provide and return activity will appear here permanently."
                      />
                    ) : (
                      asset.assetHistory.map((record) => (
                        <TimelineCard
                          key={record.id}
                          title={record.memberName || record.memberEmail || 'Employee'}
                          subtitle={`Provided ${formatDate(record.providedDate)}`}
                          body={`${humanize(record.conditionWhileProviding)} while providing`}
                          footer={
                            record.returnDate
                              ? `Returned ${formatDate(record.returnDate)}${
                                  record.returnedCondition ? ` · ${humanize(record.returnedCondition)}` : ''
                                }`
                              : 'Currently provided'
                          }
                        />
                      ))
                    )}
                  </HistorySection>

                  <HistorySection title="Maintenance History" icon={<Hammer className="size-4" />}>
                    {asset.maintenanceHistory.length === 0 ? (
                      <EmptyState
                        icon={<Hammer className="size-5" />}
                        title="No maintenance history yet"
                        description="Repairs, service, inspections, and damage handling will stay here permanently."
                      />
                    ) : (
                      asset.maintenanceHistory.map((log) => (
                        <TimelineCard
                          key={log.id}
                          title={humanize(log.maintenanceType)}
                          subtitle={`${humanize(log.status)} · Service date ${formatDate(log.serviceDate)}`}
                          body={log.issueDescription}
                          footer={
                            log.completedDate
                              ? `Completed ${formatDate(log.completedDate)}`
                              : log.expectedCompletionDate
                                ? `Expected completion ${formatDate(log.expectedCompletionDate)}`
                                : 'Completion date not set'
                          }
                        />
                      ))
                    )}
                  </HistorySection>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
