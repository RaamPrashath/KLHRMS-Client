'use client';

import { Archive, Hammer, History, PackageOpen, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActionButton,
  DetailField,
  EmptyState,
  HistorySection,
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

function UnitStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    AVAILABLE: 'bg-[#f3fbf5] text-[#156f3d]',
    PROVIDED: 'bg-[#f4f8ff] text-[#2454a6]',
    UNDER_MAINTENANCE: 'bg-[#fff7e8] text-[#8a5a00]',
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
  onEdit,
  onArchive,
  onProvide,
  onReturn,
  onMaintenance,
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
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: 160, y: 120, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 160, y: 120, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26, mass: 0.85 }}
              className="pointer-events-auto flex flex-col w-[92vw] max-w-270 max-h-[85vh] overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Asset Detail</p>
                  {asset && (
                    <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">
                      {asset.name}
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

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                {isLoading && !asset ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-8 w-64 rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-56 w-full rounded-lg" />
                  </div>
                ) : !asset ? (
                  <div className="py-10 text-[15px] text-[#6b7280]">Unable to load asset details.</div>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-6">
                      <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[16px] font-medium text-[#111827]">Asset Snapshot</p>
                          <Badge
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadge(asset.status)}`}
                          >
                            {humanize(asset.status)}
                          </Badge>
                        </div>
                        <div className="grid gap-3">
                          <DetailField label="Category" value={humanize(asset.category)} />
                          <DetailField label="Condition" value={humanize(asset.condition)} />
                          <DetailField label="Model" value={asset.model || 'Not recorded'} />
                          <DetailField label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                          <DetailField label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
                          <DetailField label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
                          <DetailField label="Location" value={asset.location || 'Not recorded'} />
                          <DetailField label="Current Holder" value={asset.currentHolderName || 'In register'} />
                          {asset.unitSummary && (
                            <DetailField
                              label="Units"
                              value={`${asset.unitSummary.available} available / ${asset.unitSummary.provided} issued / ${asset.unitSummary.total} total`}
                            />
                          )}
                        </div>
                      </div>

                      {asset.customFields && asset.customFields.length > 0 && (
                        <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
                          <p className="text-[16px] font-medium text-[#111827]">Custom Fields</p>
                          <div className="mt-4 grid gap-3">
                            {asset.customFields.map((cf) => (
                              <DetailField key={cf.fieldDefinitionId} label={cf.fieldName} value={cf.value || 'Not set'} />
                            ))}
                          </div>
                        </div>
                      )}

                      {asset.units && asset.units.length > 0 && (
                        <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
                          <p className="text-[16px] font-medium text-[#111827]">Units ({asset.units.length})</p>
                          <div className="mt-4 space-y-2">
                            {asset.units.map((unit: AssetUnitResponse) => (
                              <div
                                key={unit.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[inset_0_0_0_1px_#e5e7eb]"
                              >
                                <div className="flex items-center gap-2">
                                  <PackageOpen className="size-3.5 text-[#6b7280]" />
                                  <span className="text-[13px] text-[#111827]">
                                    {unit.serialNumber || 'Unit'}
                                  </span>
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
                                  if (action === 'Issue Asset') onProvide(asset);
                                  if (action === 'Return Asset') onReturn(asset);
                                  if (action === 'Log Maintenance') onMaintenance(asset);
                                }}
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
                              subtitle={`Issued ${formatDate(record.providedDate)}`}
                              body={`${humanize(record.conditionWhileProviding)} while providing`}
                              footer={
                                record.returnDate
                                  ? `Returned ${formatDate(record.returnDate)}${
                                      record.returnedCondition ? ` \u00B7 ${humanize(record.returnedCondition)}` : ''
                                    }`
                                  : 'Currently issued'
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
                              title={`${log.ticketId} \u00B7 ${humanize(log.maintenanceType)}`}
                              subtitle={`${humanize(log.status)} \u00B7 Service date ${formatDate(log.serviceDate)}`}
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
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
