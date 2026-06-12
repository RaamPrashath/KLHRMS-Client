'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LaptopMinimal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { conditionBadge, formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { AssetCondition, AssetSummary } from '@/modules/assets/types/assetTypes';

export function EmployeeAssetPivotDetailDialog({
  open,
  onOpenChange,
  employeeName,
  employeeEmail,
  assets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string | null;
  employeeEmail: string | null;
  assets: AssetSummary[];
}) {
  const sorted = useMemo(
    () => [...assets].sort((a, b) => a.name.localeCompare(b.name)),
    [assets],
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 mx-4 w-full max-w-3xl max-h-[80vh] flex flex-col rounded-[20px] bg-slate-50/90 backdrop-blur-sm shadow-2xl border border-slate-200/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-5 shrink-0 bg-white/80">
              <div>
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">
                  {employeeName || 'Unknown Employee'}
                </h2>
                {employeeEmail && (
                  <p className="text-[13px] text-slate-500 font-medium mt-0.5">{employeeEmail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {sorted.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-slate-500 bg-white border border-slate-100 rounded-2xl">
                  No assets assigned to this employee.
                </div>
              ) : (
                <div className="space-y-4">
                  {sorted.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-slate-200/60 transition-all duration-200 flex flex-col md:flex-row gap-5"
                    >
                      {/* Left Side: Icon & Asset Identity */}
                      <div className="flex items-start gap-4 md:w-1/3 shrink-0">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 shadow-inner">
                          <LaptopMinimal className="size-6" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-bold text-[15px] text-slate-900 leading-snug truncate">
                            {asset.name}
                          </p>
                          <div className="inline-flex items-center font-mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/40">
                            {asset.assetCode}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Structured Details Grid */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6 text-[13px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        {/* Column 1: Brand, Model & Serial */}
                        <div className="space-y-3">
                          {asset.brand && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Brand
                              </span>
                              <span className="font-semibold text-slate-700">
                                {asset.brand}
                              </span>
                            </div>
                          )}
                          {asset.model && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Model
                              </span>
                              <span className="font-semibold text-slate-700">
                                {asset.model}
                              </span>
                            </div>
                          )}
                          {asset.serialNumber && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Serial Number
                              </span>
                              <span className="font-semibold text-slate-700 font-mono truncate block">
                                {asset.serialNumber}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Category, Provided Date & Provided By */}
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Category
                            </span>
                            <span className="font-semibold text-slate-700">
                              {humanize(asset.category)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Provided Date
                            </span>
                            <span className="font-semibold text-slate-700">
                              {asset.providedDate ? formatDate(asset.providedDate) : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Provided By
                            </span>
                            <span className="font-semibold text-slate-700">
                              {asset.providedByName || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Column 3: Condition, Warranty & Tickets */}
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Condition
                            </span>
                            <Badge
                              className={cn(
                                'rounded-full border-0 px-2.5 py-0.5 text-[11px] font-bold shadow-sm',
                                conditionBadge(asset.condition as AssetCondition),
                              )}
                            >
                              {humanize(asset.condition)}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Warranty Expiry
                            </span>
                            <span className="font-semibold text-slate-700">
                              {asset.warrantyExpiryDate ? formatDate(asset.warrantyExpiryDate) : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Active Tickets
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm',
                                (asset.openMaintenanceCount ?? 0) > 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-50 text-slate-500 border border-slate-100',
                              )}
                            >
                              {asset.openMaintenanceCount ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

