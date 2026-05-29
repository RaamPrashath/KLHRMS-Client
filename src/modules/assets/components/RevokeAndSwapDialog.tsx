'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Laptop, RefreshCcw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { useAssetSwapPreviewQuery } from '@/modules/assets/hooks/useAssetsQuery';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import type { AssetMaintenanceSummary, AssetReplacementMode } from '@/modules/assets/types/assetTypes';

type MaintenanceOption = Pick<
  AssetMaintenanceSummary,
  'id' | 'ticketId' | 'maintenanceType' | 'status' | 'issueDescription'
>;

export function RevokeAndSwapDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  maintenanceOptions,
  defaultMaintenanceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  maintenanceOptions: MaintenanceOption[];
  defaultMaintenanceId?: string | null;
}) {
  const mutations = useAssetMutations(orgSlug, memberId);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(
    defaultMaintenanceId ?? maintenanceOptions[0]?.id ?? null,
  );
  const [manualReplacementMode, setManualReplacementMode] = useState<AssetReplacementMode | null>(null);
  const [manualReplacementAssetUnitId, setManualReplacementAssetUnitId] = useState<string | null>(null);
  const [revokeStatus, setRevokeStatus] = useState<'IN_MAINTENANCE' | 'PENDING_RETURN'>('IN_MAINTENANCE');
  const [notes, setNotes] = useState('');

  const previewQuery = useAssetSwapPreviewQuery(orgSlug, memberId, selectedMaintenanceId);
  const preview = previewQuery.data;

  const replacementMode = useMemo<AssetReplacementMode>(() => {
    const recommendedMode =
      preview?.options.find((option) => option.recommended && option.available)?.mode ??
      preview?.options.find((option) => option.available)?.mode;
    return manualReplacementMode ?? recommendedMode ?? 'PERMANENT_REPLACEMENT';
  }, [manualReplacementMode, preview]);

  const selectedOption = useMemo(
    () => preview?.options.find((option) => option.mode === replacementMode) ?? null,
    [preview, replacementMode],
  );
  const replacementAssetUnitId =
    manualReplacementAssetUnitId ?? selectedOption?.assetUnitIds[0] ?? '';

  async function handleSubmit() {
    if (!selectedMaintenanceId || !replacementAssetUnitId) return;
    try {
      await mutations.revokeAndSwap.mutateAsync({
          maintenanceId: selectedMaintenanceId,
          data: {
            maintenanceId: selectedMaintenanceId,
            replacementMode,
            replacementAssetUnitId,
          revokeStatus,
          replacementConditionWhileProviding: 'GOOD',
          notes: notes.trim() || null,
        },
      });
      toast.success('Asset revoked and replacement assigned');
      onOpenChange(false);
      setNotes('');
    } catch (error) {
      toast.error(readError(error, 'Failed to complete revoke and swap'));
    }
  }

  const canSubmit = !!selectedMaintenanceId && !!replacementAssetUnitId && !!selectedOption?.available;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl border border-[#e5e7eb] bg-white p-0">
        <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-3 text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#fff6db]">
              <RefreshCcw className="size-5 text-[#9a6700]" />
            </span>
            Revoke And Swap Asset
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-6 text-[#6b7280]">
            Revoke the malfunctioning device, move it into maintenance or pending return, and assign a replacement in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-5">
          <div className="grid gap-2">
            <Label className="text-[13px] font-medium text-[#6b7280]">Incident Ticket</Label>
            <Select
              value={selectedMaintenanceId ?? undefined}
              onValueChange={(value) => {
                setSelectedMaintenanceId(value);
                setManualReplacementMode(null);
                setManualReplacementAssetUnitId(null);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
                <SelectValue placeholder="Select a maintenance record" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.ticketId} - {humanize(option.maintenanceType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewQuery.isLoading ? (
            <div className="rounded-2xl border border-[#eef0f3] bg-[#fafafa] px-4 py-8 text-center text-[14px] text-[#6b7280]">
              Checking live inventory and replacement options...
            </div>
          ) : preview ? (
            <div className="grid gap-5">
              <div className="grid gap-3 rounded-2xl border border-[#eef0f3] bg-[#fbfbfc] p-4 md:grid-cols-3">
                <InfoCard icon={Wrench} label="Downtime" value={preview.estimatedDowntimeHours ? `${preview.estimatedDowntimeHours} hrs` : 'Not set'} />
                <InfoCard icon={AlertTriangle} label="Criticality" value={preview.operationalCriticalityTier ? humanize(preview.operationalCriticalityTier) : 'Standard'} />
                <InfoCard icon={Laptop} label="Current State" value={humanize(preview.currentAssetStatus)} />
              </div>

              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-[14px]',
                  preview.requiresReplacementValidation
                    ? 'border-[#ffe2a8] bg-[#fffaf0] text-[#8a5a00]'
                    : 'border-[#d8eadf] bg-[#f4fbf6] text-[#156f3d]',
                )}
              >
                {preview.reason}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {preview.options.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => {
                      setManualReplacementMode(option.mode);
                      setManualReplacementAssetUnitId(option.assetUnitIds[0] ?? null);
                    }}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors',
                      replacementMode === option.mode
                        ? 'border-[#00874a] bg-[#f4fbf6]'
                        : 'border-[#e5e7eb] bg-white',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-[#111827]">{option.label}</p>
                        <p className="mt-1 text-[13px] text-[#6b7280]">
                          {option.available ? `${option.availableCount} unit(s) available` : 'No stock available'}
                        </p>
                      </div>
                      {option.recommended && (
                        <span className="rounded-full bg-[#fff6db] px-2.5 py-1 text-[11px] font-semibold text-[#9a6700]">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {option.serialNumbers.slice(0, 4).map((serial) => (
                        <span
                          key={serial}
                          className="rounded-full border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1 text-[11px] text-[#4b5563]"
                        >
                          {serial}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-[13px] font-medium text-[#6b7280]">Replacement Unit</Label>
                  <Select
                    value={replacementAssetUnitId || undefined}
                    onValueChange={setManualReplacementAssetUnitId}
                    disabled={!selectedOption?.available}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
                      <SelectValue placeholder="Select a replacement unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedOption?.assetUnitIds ?? []).map((unitId, index) => (
                        <SelectItem key={unitId} value={unitId}>
                          {selectedOption?.serialNumbers[index] ?? unitId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[13px] font-medium text-[#6b7280]">Revoked Asset Status</Label>
                  <Select value={revokeStatus} onValueChange={(value) => setRevokeStatus(value as typeof revokeStatus)}>
                    <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_MAINTENANCE">In Maintenance</SelectItem>
                      <SelectItem value="PENDING_RETURN">Pending Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-[13px] font-medium text-[#6b7280]">Notes</Label>
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional admin note for the swap"
                  className="h-11 rounded-2xl border-[#e5e7eb] shadow-none"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#ffe2a8] bg-[#fffaf0] px-4 py-8 text-center text-[14px] text-[#8a5a00]">
              No swap preview is available for this ticket.
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#eef0f3] px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || mutations.revokeAndSwap.isPending}
            className="rounded-full bg-[#00874a] px-5 text-white hover:bg-[#007241]"
          >
            {mutations.revokeAndSwap.isPending ? 'Processing...' : 'Revoke And Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eef0f3] bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[#6b7280]" />
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#9ca3af]">{label}</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold text-[#111827]">{value}</p>
    </div>
  );
}
