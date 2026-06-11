'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  LaptopMinimal,
  PackagePlus,
  RotateCcw,
  Search,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { readError } from '@/modules/assets/lib/assetUtils';
import type { AssetIssueInput } from '@/modules/assets/schema/assetSchemas';
import type {
  AssetLookupOption,
  AvailableAssetGroup,
} from '@/modules/assets/types/assetTypes';

export function IssueAssetDialog({
  open,
  onOpenChange,
  members,
  availableGroups,
  memberId,
  onIssue,
  isGroupsLoading,
  canManageAssets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: AssetLookupOption[];
  availableGroups: AvailableAssetGroup[];
  memberId: string;
  onIssue: (data: AssetIssueInput) => Promise<void>;
  isGroupsLoading?: boolean;
  canManageAssets: boolean;
}) {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployeeMemberId, setSelectedEmployeeMemberId] = useState<string | null>(null);

  const [groupQuery, setGroupQuery] = useState('');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AvailableAssetGroup | null>(null);

  const [isIssuing, setIsIssuing] = useState(false);

  const employeeInputRef = useRef<HTMLInputElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const groupInputRef = useRef<HTMLInputElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  const selectedEmployee = useMemo(
    () => members.find((m) => m.id === selectedEmployeeMemberId) ?? null,
    [members, selectedEmployeeMemberId],
  );

  const filteredGroups = useMemo(
    () => {
      const q = groupQuery.toLowerCase().trim();
      const selectedLabel = selectedGroup ? groupDisplayLabel(selectedGroup).toLowerCase().trim() : '';
      if (!q || q === selectedLabel) return availableGroups;
      return availableGroups.filter(
        (g) =>
          g.assetName.toLowerCase().includes(q) ||
          g.assetCode.toLowerCase().includes(q) ||
          (g.categoryName ?? '').toLowerCase().includes(q) ||
          (g.model ?? '').toLowerCase().includes(q),
      );
    },
    [availableGroups, groupQuery, selectedGroup],
  );

  const filteredEmployees = useMemo(
    () => {
      const q = employeeQuery.toLowerCase().trim();
      const selectedName = selectedEmployee ? memberDisplayName(selectedEmployee).toLowerCase().trim() : '';
      if (!q || q === selectedName) return members;
      return members.filter(
        (m) =>
          memberDisplayName(m).toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q),
      );
    },
    [members, employeeQuery, selectedEmployee],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setEmployeeDropdownOpen(false);
      }
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target as Node)
      ) {
        setGroupDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleEmployeeSelect(member: AssetLookupOption) {
    setSelectedEmployeeMemberId(member.id);
    setEmployeeQuery(memberDisplayName(member));
    setEmployeeDropdownOpen(false);
  }

  function handleEmployeeInputChange(value: string) {
    setEmployeeQuery(value);
    setEmployeeDropdownOpen(true);
    if (!value) {
      setSelectedEmployeeMemberId(null);
    }
  }

  function handleClearEmployee() {
    setSelectedEmployeeMemberId(null);
    setEmployeeQuery('');
    setEmployeeDropdownOpen(false);
    employeeInputRef.current?.focus();
  }

  function handleGroupSelect(group: AvailableAssetGroup) {
    setSelectedGroup(group);
    setGroupQuery(groupDisplayLabel(group));
    setGroupDropdownOpen(false);
  }

  function handleGroupInputChange(value: string) {
    setGroupQuery(value);
    setGroupDropdownOpen(true);
    if (!value) {
      setSelectedGroup(null);
    }
  }

  function handleClearGroup() {
    setSelectedGroup(null);
    setGroupQuery('');
    setGroupDropdownOpen(false);
    groupInputRef.current?.focus();
  }

  function handleReset() {
    setSelectedEmployeeMemberId(null);
    setSelectedGroup(null);
    setGroupQuery('');
    setEmployeeQuery('');
    setEmployeeDropdownOpen(false);
    setGroupDropdownOpen(false);
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
      onOpenChange(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to issue asset'));
    } finally {
      setIsIssuing(false);
    }
  }

  function memberDisplayName(member: AssetLookupOption): string {
    const raw = (member.label || member.email || '').trim();
    if (raw.includes('@')) {
      const localPart = raw.split('@')[0] ?? raw;
      return localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    return raw;
  }

  function groupDisplayLabel(group: AvailableAssetGroup): string {
    const parts: string[] = [];
    if (group.categoryName) parts.push(group.categoryName);
    if (group.brand) parts.push(group.brand);
    parts.push(group.assetCode);
    return parts.join(' / ');
  }

  const isSelfAssigned = selectedEmployeeMemberId === memberId;
  const canSubmit = !!selectedEmployeeMemberId && !!selectedGroup;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden" showCloseButton={false}>
        <DialogTitle className="sr-only">Issue Asset</DialogTitle>
        <DialogDescription className="sr-only">Assign an available asset unit to an employee.</DialogDescription>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <PackagePlus className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold tracking-tight">Issue Asset</h2>
            </div>
            <p className="text-[12px] text-slate-500 pl-9">Assign an available asset unit to an employee.</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form className="px-5 py-4 space-y-4 overflow-y-auto max-h-[60vh] flex-1" onSubmit={(e) => { e.preventDefault(); void handleIssue(); }}>

          {/* Select Employee */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Select Employee</label>
            <div className="relative" ref={employeeDropdownRef}>
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                ref={employeeInputRef}
                type="text"
                value={employeeQuery}
                onChange={(e) => handleEmployeeInputChange(e.target.value)}
                onFocus={() => setEmployeeDropdownOpen(true)}
                placeholder="Search employee..."
                className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={selectedEmployeeMemberId && employeeQuery ? handleClearEmployee : () => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {selectedEmployeeMemberId && employeeQuery ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>

              {/* Employee Dropdown */}
              {employeeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-48 overflow-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No employees found</div>
                  ) : (
                    filteredEmployees.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleEmployeeSelect(m)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 transition flex flex-col"
                      >
                        <span className="text-[12px] font-medium text-slate-800">
                          {memberDisplayName(m)}
                        </span>
                        {m.email && (
                          <span className="text-[10px] text-slate-400">{m.email}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {isSelfAssigned ? (
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 pl-1">
                <Check className="size-3" />
                Assigned to you
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const me = members.find((m) => m.id === memberId);
                  if (me) {
                    handleEmployeeSelect(me);
                  }
                }}
                className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors pl-1 cursor-pointer"
              >
                Assign to myself
              </button>
            )}
          </div>

          {/* Asset Group Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Select Asset</label>
            <div className="relative" ref={groupDropdownRef}>
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <LaptopMinimal className="w-4 h-4" />
              </span>
              <input
                ref={groupInputRef}
                type="text"
                value={groupQuery}
                onChange={(e) => handleGroupInputChange(e.target.value)}
                onFocus={() => setGroupDropdownOpen(true)}
                placeholder="Search asset name, code, or model..."
                className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={selectedGroup ? handleClearGroup : () => setGroupDropdownOpen(!groupDropdownOpen)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {selectedGroup ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>

              {/* Group Dropdown */}
              {groupDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-48 overflow-auto">
                  {isGroupsLoading ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Loading...</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No available assets found</div>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.groupKey}
                        type="button"
                        onClick={() => handleGroupSelect(g)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 transition flex items-center gap-2.5"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                          <PackagePlus className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-medium text-slate-800 block truncate">
                            {groupDisplayLabel(g)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {g.model ? `${g.model} \u00B7 ` : ''}
                            Available: {g.availableQuantity}
                          </span>
                        </div>
                        <Badge className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border-0 shrink-0">
                          {g.availableQuantity}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 bg-white text-slate-500 rounded-xl text-xs font-medium hover:text-slate-700 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || isIssuing || !canManageAssets}
            onClick={() => void handleIssue()}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
          >
            {isIssuing ? (
              <span className="flex items-center gap-1.5">
                <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Issuing...
              </span>
            ) : (
              'Issue Asset'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
