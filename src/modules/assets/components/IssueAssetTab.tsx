'use client';

import { useMemo, useState } from 'react';
import { LaptopMinimal, PackagePlus, User, X } from 'lucide-react';
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
import { readError } from '@/modules/assets/lib/assetUtils';
import type { AssetIssueInput } from '@/modules/assets/schema/assetSchemas';
import type { AssetLookupOption, AvailableAssetGroup } from '@/modules/assets/types/assetTypes';

export function IssueAssetTab({
  members,
  availableGroups,
  canManageAssets,
  memberId,
  onIssue,
  isGroupsLoading,
}: {
  members: AssetLookupOption[];
  availableGroups: AvailableAssetGroup[];
  canManageAssets: boolean;
  memberId: string;
  onIssue: (data: AssetIssueInput) => Promise<void>;
  isGroupsLoading?: boolean;
}) {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState<string | null>(null);
  const [selectedEmployeeMemberId, setSelectedEmployeeMemberId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AvailableAssetGroup | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

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

  const filteredGroups = useMemo(
    () => {
      const q = groupQuery.toLowerCase().trim();
      if (!q) return availableGroups;
      return availableGroups.filter(
        (g) =>
          g.assetName.toLowerCase().includes(q) ||
          g.assetCode.toLowerCase().includes(q) ||
          (g.categoryName ?? '').toLowerCase().includes(q) ||
          (g.model ?? '').toLowerCase().includes(q),
      );
    },
    [availableGroups, groupQuery],
  );

  function handleEmployeeSelect(label: string) {
    setSelectedEmployeeLabel(label);
    const m = members.find((x) => x.label === label);
    setSelectedEmployeeMemberId(m?.id ?? null);
    setEmployeeQuery(label);
  }

  function handleGroupSelect(label: string) {
    const group = availableGroups.find((g) => groupDisplayLabel(g) === label);
    setSelectedGroup(group ?? null);
    if (group) {
      setGroupQuery(label);
    }
  }

  function handleReset() {
    setSelectedEmployeeLabel(null);
    setSelectedEmployeeMemberId(null);
    setSelectedGroup(null);
    setEmployeeQuery('');
    setGroupQuery('');
  }

  async function handleIssue() {
    if (!selectedEmployeeMemberId || !selectedGroup) return;
    setIsIssuing(true);
    try {
      await onIssue({
        memberId: selectedEmployeeMemberId,
        groupKey: selectedGroup.groupKey,
        quantity: 1,
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

  const isSelfAssigned = selectedEmployeeMemberId === memberId;

  function groupDisplayLabel(group: AvailableAssetGroup): string {
    const parts = [group.assetName];
    if (group.categoryName) parts.push(group.categoryName);
    parts.push(group.assetCode);
    return parts.join(' / ');
  }

  return (
    <div className="w-full">
      <h2 className="text-[18px] font-semibold text-[#111827]">Issue Asset</h2>
      <p className="mt-0.5 text-[13px] text-[#6b7280]">Assign physical assets to employees from available stock</p>
      <Separator className="my-4" />

      <div className="flex items-start gap-10 flex-wrap">
        {/* Employee Combobox */}
        <div className="w-64">
          <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Employee</Label>
          <Combobox
            value={selectedEmployeeLabel}
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
              {selectedEmployeeLabel && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedEmployeeLabel(null); setSelectedEmployeeMemberId(null); setEmployeeQuery(''); }}
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
            onClick={() => {
              const m = members.find((x) => x.id === memberId);
              if (m) {
                setSelectedEmployeeLabel(m.label);
                setSelectedEmployeeMemberId(m.id);
                setEmployeeQuery(m.label);
              }
            }}
            className={cn(
              'mt-1.5 text-[12px] font-medium transition-colors',
              isSelfAssigned ? 'text-[#156f3d]' : 'text-[#378ADD] hover:text-[#2563eb]',
            )}
          >
            Assign to myself
          </button>
        </div>

        {/* Asset Group Combobox */}
        <div className="w-80">
          <Label className="mb-1.5 block text-[12px] font-medium text-[#6b7280]">Asset</Label>
          <Combobox
            value={selectedGroup ? groupDisplayLabel(selectedGroup) : null}
            onValueChange={(val) => handleGroupSelect(val as string)}
          >
            <div className="flex items-center border-b-[1.5px] border-[#d1d5db] bg-transparent">
              <LaptopMinimal className="mr-2 size-4 shrink-0 text-[#6b7280]" />
              <ComboboxInput
                placeholder="Search asset name, code, or model..."
                showTrigger={false}
                showClear={false}
                className="w-full border-0 rounded-none shadow-none bg-transparent [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div]:h-auto"
              />
              {selectedGroup && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); setGroupQuery(''); }}
                  className="ml-1 flex size-5 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
            </div>

            <ComboboxContent className="p-1 shadow-none border border-[#e2e5ea] rounded-lg">
              <ComboboxList>
                {isGroupsLoading ? (
                  <div className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">Loading...</div>
                ) : filteredGroups.length === 0 ? (
                  <ComboboxEmpty>No available assets found</ComboboxEmpty>
                ) : (
                  filteredGroups.map((g) => (
                    <ComboboxItem
                      key={g.groupKey}
                      value={groupDisplayLabel(g)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-md data-selected:bg-[#f8f9fa]"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                        <PackagePlus className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#111827] truncate">{groupDisplayLabel(g)}</p>
                        <p className="text-[11px] text-[#6b7280]">
                          {g.model ? `${g.model} \u00B7 ` : ''}
                          Available: {g.availableQuantity}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-[#eef9f1] px-2.5 py-0.5 text-[11px] font-medium text-[#156f3d] border-0 shrink-0">
                        {g.availableQuantity}
                      </Badge>
                    </ComboboxItem>
                  ))
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
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
            disabled={!selectedEmployeeMemberId || !selectedGroup || isIssuing || !canManageAssets}
            className="rounded-lg bg-[#1a7a45] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#156f3d] disabled:opacity-40"
          >
            {isIssuing ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Issuing...
              </span>
            ) : (
              'Issue Asset'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
