'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Hammer, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import { assetMaintenanceTypeOptions } from '@/modules/assets/schema/assetSchemas';
import type { AssetSummary } from '@/modules/assets/types/assetTypes';

export function RaiseTicketDialog({
  open,
  onOpenChange,
  assets,
  memberId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assets: AssetSummary[];
  memberId: string;
  onSubmit: (data: { assetId: string; maintenanceType: string; issueDescription: string }) => Promise<void>;
}) {
  const [step, setStep] = useState<'select' | 'describe'>('select');
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [maintenanceType, setMaintenanceType] = useState('REPAIR');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignedAssets = useMemo(
    () => assets.filter((a) => a.currentHolderMemberId === memberId),
    [assets, memberId],
  );

  const filteredAssets = useMemo(
    () => assignedAssets.filter(
      (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.assetCode.toLowerCase().includes(search.toLowerCase()),
    ),
    [assignedAssets, search],
  );

  const selectedAsset = assignedAssets.find((a) => a.id === selectedAssetId);

  function handleSelectAsset(assetId: string) {
    setSelectedAssetId(assetId);
    setStep('describe');
  }

  async function handleSubmit() {
    if (!selectedAssetId || !description.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        assetId: selectedAssetId,
        maintenanceType,
        issueDescription: description.trim(),
      });
      toast.success('Ticket raised successfully');
      handleClose();
    } catch (error) {
      toast.error(readError(error, 'Failed to raise ticket'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep('select');
    setSearch('');
    setSelectedAssetId(null);
    setMaintenanceType('REPAIR');
    setDescription('');
    onOpenChange(false);
  }

  if (!assignedAssets.length) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 160, y: 240, scale: 0.82 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 160, y: 240, scale: 0.82 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-[#fff3f2]">
                  <Hammer className="size-4.5 text-[#b3261e]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                    {step === 'select' ? 'Report an Issue' : 'Describe the Problem'}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6e6e73]">
                    {step === 'select'
                      ? 'Select the asset that needs service'
                      : `Reporting issue for ${selectedAsset?.name ?? ''}`
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex size-8 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1d1d1f]"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {step === 'select' ? (
              <div className="px-5 py-4">
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
                  <Search className="size-4 shrink-0 text-[#9ca3af]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your assigned assets..."
                    className="h-auto border-0 bg-transparent px-0 py-0 text-[14px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
                  />
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {filteredAssets.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-[#6e6e73]">
                      {search ? 'No assets match your search' : 'No assets assigned to you'}
                    </div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectAsset(asset.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                          selectedAssetId === asset.id
                            ? 'bg-[#f3fbf5] ring-1 ring-[#00874a]/30'
                            : 'hover:bg-[#f8f9fc]'
                        }`}
                      >
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                          selectedAssetId === asset.id ? 'bg-[#00874a] text-white' : 'bg-[#f0f4f8] text-[#6b7280]'
                        }`}>
                          <Hammer className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{asset.name}</p>
                          <p className="text-[12px] text-[#6e6e73]">{asset.assetCode}</p>
                        </div>
                        <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedAssetId === asset.id
                            ? 'border-[#00874a] bg-[#00874a] text-white'
                            : 'border-[#d2d2d7]'
                        }`}>
                          {selectedAssetId === asset.id && <Check className="size-3" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-[13px] text-[#6b7280]">Issue Type</Label>
                  <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                    <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] text-[15px] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assetMaintenanceTypeOptions.map((t) => (
                        <SelectItem key={t} value={t} className="text-[13px]">
                          {humanize(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[13px] text-[#6b7280]">Describe the Problem</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What seems to be the issue?"
                    rows={4}
                    className="rounded-2xl border-[#e5e7eb] px-4 py-3 text-[15px] shadow-none resize-none placeholder:text-[#9ca3af]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#eef0f3] px-5 py-4">
              {step === 'describe' ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setStep('select')}
                    className="rounded-full px-5 text-[13px]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !description.trim()}
                    className="h-10 rounded-full px-6 text-[14px] font-medium text-white"
                    style={{ backgroundColor: '#b3261e' }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="rounded-full px-5 text-[13px]"
                  >
                    Cancel
                  </Button>
                  <div className="text-[12px] text-[#6e6e73]">
                    {assignedAssets.length} asset{assignedAssets.length !== 1 ? 's' : ''} assigned
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
