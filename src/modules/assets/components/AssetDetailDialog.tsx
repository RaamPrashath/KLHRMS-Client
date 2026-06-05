'use client';

import { useState } from 'react';
import { Archive, Hammer, History, PackageOpen, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ActionButton,
  DetailField,
  EmptyState,
  TimelineCard,
} from '@/modules/assets/components/assetsPagePrimitives';
import {
  conditionBadge,
  formatCurrency,
  formatDate,
  getRowActions,
  humanize,
  statusBadge,
} from '@/modules/assets/lib/assetUtils';
import type { AssetCondition, AssetDetail, AssetSummary, AssetUnitResponse } from '@/modules/assets/types/assetTypes';

type AssetDetailTab = 'details' | 'history' | 'maintenance';

const DETAIL_TABS: Array<{ id: AssetDetailTab; label: string }> = [
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'Asset History' },
  { id: 'maintenance', label: 'Maintenance History' },
];

function UnitStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    AVAILABLE: 'bg-[#f3fbf5] text-[#156f3d]',
    ASSIGNED: 'bg-[#f4f8ff] text-[#2454a6]',
    IN_MAINTENANCE: 'bg-[#fff7e8] text-[#8a5a00]',
    PENDING_RETURN: 'bg-[#fff6db] text-[#8a5a00]',
    DAMAGED: 'bg-[#fff3f2] text-[#b3261e]',
    LOST: 'bg-[#f3f4f6] text-[#6b7280]',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${colorMap[status] || colorMap.AVAILABLE}`}>
      {humanize(status)}
    </span>
  );
}

export function AssetDetailDialog({
  open,
  onOpenChange,
  isLoading,
  asset,
  canManageAssets,
  hideActions = false,
  titleOverride,
  onEdit,
  onArchive,
  onProvide,
  onReturn,
  onMaintenance,
  onRevokeSwap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  asset?: AssetDetail;
  canManageAssets: boolean;
  hideActions?: boolean;
  titleOverride?: string;
  onEdit: (asset: AssetSummary | AssetDetail) => void;
  onArchive: (assetId: string) => void;
  onProvide: (asset: AssetSummary) => void;
  onReturn: (asset: AssetSummary) => void;
  onMaintenance: (asset: AssetSummary) => void;
  onRevokeSwap?: (asset: AssetDetail) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <AssetDetailDialogContent
          onOpenChange={onOpenChange}
          isLoading={isLoading}
          asset={asset}
          canManageAssets={canManageAssets}
          hideActions={hideActions}
          titleOverride={titleOverride}
          onEdit={onEdit}
          onArchive={onArchive}
          onProvide={onProvide}
          onReturn={onReturn}
          onMaintenance={onMaintenance}
          onRevokeSwap={onRevokeSwap}
        />
      )}
    </AnimatePresence>
  );
}

function AssetDetailDialogContent({
  onOpenChange,
  isLoading,
  asset,
  canManageAssets,
  hideActions,
  titleOverride,
  onEdit,
  onArchive,
  onProvide,
  onReturn,
  onMaintenance,
  onRevokeSwap,
}: {
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  asset?: AssetDetail;
  canManageAssets: boolean;
  hideActions: boolean;
  titleOverride?: string;
  onEdit: (asset: AssetSummary | AssetDetail) => void;
  onArchive: (assetId: string) => void;
  onProvide: (asset: AssetSummary) => void;
  onReturn: (asset: AssetSummary) => void;
  onMaintenance: (asset: AssetSummary) => void;
  onRevokeSwap?: (asset: AssetDetail) => void;
}) {
  const [activeTab, setActiveTab] = useState<AssetDetailTab>('details');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
          className="pointer-events-auto flex flex-col w-[92vw] max-w-lg h-[600px] overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0 bg-white">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">Asset Detail</p>
              {asset && (
                <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">
                  {titleOverride || asset.name}
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
            >
              <X className="size-4.5" />
            </button>
          </div>

          {asset && (
            <div className="flex border-b border-[#eef0f3] bg-neutral-50/50 px-6 shrink-0">
              <div className="flex gap-6">
                {DETAIL_TABS.filter((tab) => canManageAssets || tab.id !== 'history').map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'relative py-3.5 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer',
                        isActive
                          ? 'text-primary border-b-2 border-primary -mb-[2px]'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-neutral-50/10">
            {isLoading && !asset ? (
              <div className="mx-auto max-w-xl w-full space-y-4 py-4">
                <Skeleton className="h-8 w-64 rounded-lg" />
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : !asset ? (
              <div className="py-10 text-center text-[15px] text-[#6b7280]">Unable to load asset details.</div>
            ) : (
              <div className="w-full">
                {activeTab === 'details' && (
                  <div className="mx-auto max-w-xl w-full space-y-6">
                    <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5 shadow-xs">
                      <div className="mb-4 flex items-center justify-between border-b border-[#eef0f3] pb-2">
                        <p className="text-[16px] font-semibold text-[#111827]">Asset Snapshot</p>
                        <Badge
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadge(asset.status)}`}
                        >
                          {humanize(asset.status)}
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        <DetailField label="Category" value={humanize(asset.category)} />
                        <DetailField label="Condition" value={humanize(asset.condition)} />
                        <DetailField label="Brand" value={asset.brand || 'Not recorded'} />
                        <DetailField label="Model" value={asset.model || 'Not recorded'} />
                        <DetailField label="Location" value={asset.location || 'Not recorded'} />
                        <DetailField label="Current Holder" value={asset.currentHolderName || 'In register'} />
                        {canManageAssets && (
                          <>
                            <DetailField label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                            <DetailField label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                            <DetailField label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
                          </>
                        )}
                        {canManageAssets && asset.unitSummary && (
                          <DetailField
                            label="Units"
                            value={`${asset.unitSummary.available} available / ${asset.unitSummary.provided} issued / ${asset.unitSummary.total} total`}
                          />
                        )}
                      </div>
                    </div>

                    {canManageAssets && asset.units.length > 0 && (
                      <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5 shadow-xs">
                        <p className="text-[16px] font-semibold text-[#111827]">Units ({asset.units.length})</p>
                        <div className="mt-4 space-y-2">
                          {asset.units.map((unit: AssetUnitResponse) => (
                            <div
                              key={unit.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[inset_0_0_0_1px_#e5e7eb]"
                            >
                              <div className="flex items-center gap-2">
                                <PackageOpen className="size-3.5 text-[#6b7280]" />
                                <span className="text-[13px] text-[#111827]">{unit.serialNumber || 'Unit'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UnitStatusBadge status={unit.status} />
                                {unit.condition && (
                                  <Badge
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${conditionBadge(unit.condition as AssetCondition)}`}
                                  >
                                    {humanize(unit.condition)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hideActions && (
                      <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5 shadow-xs">
                        <p className="text-[16px] font-semibold text-[#111827]">Actions</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {getRowActions(asset.status)
                            .filter((action) => action !== 'View' && action !== 'Retire')
                            .filter((action) => {
                              if (canManageAssets) return true;
                              return action === 'Log Maintenance' || action === 'Return Asset';
                            })
                            .map((action) => (
                              <ActionButton
                                key={action}
                                label={action}
                                onClick={() => {
                                  if (action === 'Edit') onEdit(asset);
                                  if (action === 'Issue Asset') onProvide(asset);
                                  if (action === 'Return Asset') onReturn(asset);
                                  if (action === 'Log Maintenance') onMaintenance(asset);
                                  if (action === 'Revoke & Swap') onRevokeSwap?.(asset);
                                }}
                              />
                            ))}
                          {canManageAssets && asset.status !== 'ASSIGNED' && (
                            <Button
                              variant="outline"
                              className="rounded-full border-[#d8dde5] px-4 text-[12px] h-8"
                              onClick={() => onArchive(asset.id)}
                            >
                              <Archive className="mr-2 size-3.5" />
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="mx-auto max-w-xl w-full space-y-4">
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
                          subtitle={`Issued ${formatDate(record.providedDate)}`}
                          body={`${humanize(record.conditionWhileProviding)} while providing`}
                          footer={
                            record.returnDate
                              ? `Returned ${formatDate(record.returnDate)}${record.returnedCondition ? ` · ${humanize(record.returnedCondition)}` : ''}`
                              : 'Currently issued'
                          }
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="mx-auto max-w-xl w-full space-y-4">
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
                          title={`${log.ticketId} · ${humanize(log.maintenanceType)}`}
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
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
