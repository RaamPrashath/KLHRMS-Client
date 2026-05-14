'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronsUpDown, Hammer, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [maintenanceType, setMaintenanceType] = useState('REPAIR');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignedAssets = useMemo(
    () => assets.filter((a) => a.currentHolderMemberId === memberId),
    [assets, memberId],
  );

  const selectedAsset = assignedAssets.find((a) => a.id === selectedAssetId);

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
    setAssetSearchOpen(false);
    setSelectedAssetId(null);
    setMaintenanceType('REPAIR');
    setDescription('');
    onOpenChange(false);
  }

  if (!assignedAssets.length) return null;

  const canSubmit = selectedAssetId && description.trim();

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
                    Report an Issue
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#6e6e73]">
                    Select an asset and describe the problem
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

            <div className="px-5 py-4 space-y-5">
              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73] font-medium">
                  Asset <span className="text-[#b3261e]">*</span>
                </Label>
                <Popover open={assetSearchOpen} onOpenChange={setAssetSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={assetSearchOpen}
                      className={cn(
                        'h-11 w-full justify-between rounded-2xl border-[#e5e7eb] px-4 text-[15px] font-normal shadow-none',
                        selectedAsset ? 'text-[#1d1d1f]' : 'text-[#9ca3af]',
                      )}
                    >
                      {selectedAsset
                        ? `${selectedAsset.name} (${selectedAsset.assetCode})`
                        : 'Search your assigned assets...'}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 text-[#86868b]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={4}
                    className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-[#e5e7eb] p-0 shadow-lg"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search assets..."
                        className="h-11 text-[15px]"
                      />
                      <CommandList>
                        <CommandEmpty className="py-6 text-[13px] text-[#6e6e73]">
                          No assets found
                        </CommandEmpty>
                        <CommandGroup>
                          {assignedAssets.map((asset) => (
                            <CommandItem
                              key={asset.id}
                              value={`${asset.name} ${asset.assetCode}`}
                              onSelect={() => {
                                setSelectedAssetId(asset.id);
                                setAssetSearchOpen(false);
                              }}
                              className="flex items-center gap-3 py-2.5 px-3 text-[14px]"
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f4f8] text-[#6b7280]">
                                <Hammer className="size-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-[#1d1d1f] truncate">
                                  {asset.name}
                                </p>
                                <p className="text-[12px] text-[#6e6e73]">
                                  {asset.assetCode}
                                </p>
                              </div>
                              <Check
                                className={cn(
                                  'size-4 shrink-0',
                                  selectedAssetId === asset.id
                                    ? 'text-[#00874a] opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedAsset && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="grid gap-2">
                    <Label className="text-[13px] text-[#6e6e73] font-medium">
                      Issue Type <span className="text-[#b3261e]">*</span>
                    </Label>
                    <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                      <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] text-[15px] shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-[#e5e7eb]">
                        {assetMaintenanceTypeOptions.map((t) => (
                          <SelectItem key={t} value={t} className="text-[14px]">
                            {humanize(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[13px] text-[#6e6e73] font-medium">
                      Description <span className="text-[#b3261e]">*</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What seems to be the issue? Describe the problem in detail..."
                      rows={4}
                      className="rounded-2xl border-[#e5e7eb] px-4 py-3 text-[15px] shadow-none resize-none placeholder:text-[#9ca3af]"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#eef0f3] px-5 py-4">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="rounded-full px-5 text-[13px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || submitting}
                className="h-10 rounded-full px-6 text-[14px] font-medium text-white"
                style={{ backgroundColor: '#b3261e' }}
              >
                {submitting ? 'Submitting...' : 'Raise Ticket'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
