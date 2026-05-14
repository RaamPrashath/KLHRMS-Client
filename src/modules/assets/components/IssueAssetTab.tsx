'use client';

import { useMemo, useRef, useState } from 'react';
import { Info, LaptopMinimal, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import type { AssetProvideInput } from '@/modules/assets/schema/assetSchemas';
import type { AssetLookupOption, AssetSummary } from '@/modules/assets/types/assetTypes';

export function IssueAssetTab({
  members,
  availableAssets,
  canManageAssets,
  memberId,
  onIssue,
}: {
  members: AssetLookupOption[];
  availableAssets: AssetSummary[];
  canManageAssets: boolean;
  memberId: string;
  onIssue: (data: AssetProvideInput) => Promise<void>;
}) {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [showAssetTooltip, setShowAssetTooltip] = useState(false);
  const [tooltipHovered, setTooltipHovered] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const selectedAsset = selectedAssetId
    ? availableAssets.find((a) => a.id === selectedAssetId) ?? null
    : null;

  const filteredEmployees = useMemo(
    () => {
      const q = employeeQuery.toLowerCase().trim();
      if (!q) return members;
      return members.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q),
      );
    },
    [members, employeeQuery],
  );

  const filteredAssets = useMemo(
    () => {
      const q = assetQuery.toLowerCase().trim();
      if (!q) return availableAssets;
      return availableAssets.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    },
    [availableAssets, assetQuery],
  );

  function handleEmployeeSelect(id: string) {
    setSelectedEmployeeId(id);
    const m = members.find((x) => x.id === id);
    setEmployeeQuery(m?.label ?? '');
  }

  function handleAssetSelect(id: string) {
    setSelectedAssetId(id);
    const a = availableAssets.find((x) => x.id === id);
    setAssetQuery(a ? `${a.name} — ${a.assetCode}` : '');
  }

  function handleReset() {
    setSelectedEmployeeId(null);
    setSelectedAssetId(null);
    setEmployeeQuery('');
    setAssetQuery('');
    setShowAssetTooltip(false);
  }

  async function handleIssue() {
    if (!selectedEmployeeId || !selectedAssetId) return;
    setIsIssuing(true);
    try {
      await onIssue({
        memberId: selectedEmployeeId,
        assetId: selectedAssetId,
        assetUnitId: null,
        providedDate: new Date().toISOString().split('T')[0],
        conditionWhileProviding: 'GOOD',
        providedByMemberId: memberId,
        notes: '',
      });
      toast.success('Asset issued successfully');
      handleReset();
    } catch (error) {
      toast.error(readError(error, 'Failed to issue asset'));
    } finally {
      setIsIssuing(false);
    }
  }

  const isSelfAssigned = selectedEmployeeId === memberId;

  return (
    <div className="w-full">
      <h2 className="text-[18px] font-semibold text-[#111827]">Issue asset</h2>
      <Separator className="my-4" />

      <div className="flex items-start gap-10">
        {/* Employee Combobox */}
        <div className="w-64">
          <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Employee</Label>
          <Combobox
            value={selectedEmployeeId}
            onValueChange={(val) => handleEmployeeSelect(val as string)}
          >
            <div className="flex items-center border-b-[1.5px] border-[#d1d5db] bg-transparent">
              <User className="mr-2 size-4 shrink-0 text-[#6b7280]" />
              <ComboboxInput
                placeholder="Search by name or role..."
                showTrigger={false}
                showClear={false}
                className="w-full border-0 rounded-none shadow-none bg-transparent [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div]:h-auto"
              />
              {selectedEmployeeId && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedEmployeeId(null); setEmployeeQuery(''); }}
                  className="flex size-5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
            </div>
            <ComboboxContent className="p-1 shadow-none border border-[#e2e5ea] rounded-lg">
              <ComboboxList>
                {filteredEmployees.length === 0 ? (
                  <ComboboxEmpty>No results found</ComboboxEmpty>
                ) : (
                  filteredEmployees.map((m) => (
                    <ComboboxItem
                      key={m.id}
                      value={m.label}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-selected:bg-[#f8f9fa]"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0f4f8] text-[11px] font-semibold text-[#6b7280]">
                        {m.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#111827] truncate">{m.label}</p>
                        <p className="text-[11px] text-[#6b7280]">Employee</p>
                      </div>
                    </ComboboxItem>
                  ))
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <button
            type="button"
            onClick={() => handleEmployeeSelect(memberId)}
            className={cn(
              'mt-1.5 text-[12px] font-medium transition-colors',
              isSelfAssigned ? 'text-[#156f3d]' : 'text-[#378ADD] hover:text-[#2563eb]',
            )}
          >
            Assign to myself
          </button>
        </div>

        {/* Asset Combobox */}
        <div className="w-64">
          <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Asset</Label>
          <div className="relative">
          <Combobox
            value={selectedAssetId}
            onValueChange={(val) => handleAssetSelect(val as string)}
          >
            <div className="flex items-center border-b-[1.5px] border-[#d1d5db] bg-transparent">
              <LaptopMinimal className="mr-2 size-4 shrink-0 text-[#6b7280]" />
              <ComboboxInput
                placeholder="Search by name or category..."
                showTrigger={false}
                showClear={false}
                className="w-full border-0 rounded-none shadow-none bg-transparent [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div]:h-auto"
              />
              {selectedAsset && (
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setShowAssetTooltip(true)}
                  onMouseLeave={() => setShowAssetTooltip(false)}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#378ADD] text-[#378ADD] transition-colors hover:bg-[#eff6ff]"
                >
                  <Info className="size-3" />
                </button>
              )}
              {selectedAssetId && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedAssetId(null); setAssetQuery(''); setShowAssetTooltip(false); }}
                  className="ml-1 flex size-5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
            </div>

            {/* Asset tooltip */}
            {selectedAsset && (showAssetTooltip || tooltipHovered) && (
              <div
                ref={tooltipRef}
                className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-[#e2e5ea] bg-white"
                onMouseEnter={() => setTooltipHovered(true)}
                onMouseLeave={() => setTooltipHovered(false)}
              >
                <div className="border-b border-[#eef0f3] px-4 py-3">
                  <p className="text-[14px] font-semibold text-[#111827]">{selectedAsset.name}</p>
                  <p className="mt-0.5 text-[12px] text-[#6b7280]">{selectedAsset.assetCode}</p>
                </div>
                <div className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">Model</span>
                    <span className="text-[13px] text-[#111827]">{selectedAsset.model || '\u2014'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">Quantity</span>
                    <Badge className="rounded-full bg-[#eef9f1] px-2.5 py-0.5 text-[11px] font-medium text-[#156f3d] border-0">
                      {selectedAsset.quantity ?? 1} available
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">Warranty</span>
                    <span className="text-[13px] text-[#111827]">{selectedAsset.warrantyExpiryDate || '\u2014'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">Condition</span>
                    <span className="text-[13px] text-[#111827]">{humanize(selectedAsset.condition)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">Category</span>
                    <span className="text-[13px] text-[#111827]">{humanize(selectedAsset.category)}</span>
                  </div>
                </div>
              </div>
            )}

            <ComboboxContent className="p-1 shadow-none border border-[#e2e5ea] rounded-lg">
              <ComboboxList>
                {filteredAssets.length === 0 ? (
                  <ComboboxEmpty>No results found</ComboboxEmpty>
                ) : (
                  filteredAssets.map((a) => (
                    <ComboboxItem
                      key={a.id}
                      value={a.name}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-selected:bg-[#f8f9fa]"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                        <LaptopMinimal className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#111827] truncate">{a.name}</p>
                        <p className="text-[11px] text-[#6b7280]">{humanize(a.category)}</p>
                      </div>
                    </ComboboxItem>
                  ))
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-4.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isIssuing}
            className="rounded-lg px-4 py-2 text-[13px] font-medium"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={() => void handleIssue()}
            disabled={!selectedEmployeeId || !selectedAssetId || isIssuing || !canManageAssets}
            className="rounded-lg bg-[#1a7a45] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#156f3d] disabled:opacity-40"
          >
            {isIssuing ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Issuing...
              </span>
            ) : (
              'Issue asset'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
