'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Cog, Laptop, Lock, RefreshCcw, Search, Ticket, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import { fetchMemberTicketsAction } from '@/modules/assets/api/assetServerActions';
import { readError } from '@/modules/assets/lib/assetUtils';
import type { AssetLookupOption, AssetReplacementMode } from '@/modules/assets/types/assetTypes';

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

export function ReplacementDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  members: AssetLookupOption[];
}) {
  const mutations = useAssetMutations(orgSlug, memberId);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replacementMode, setReplacementMode] = useState<AssetReplacementMode | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const employeeInputRef = useRef<HTMLInputElement>(null);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const ticketsQuery = useQuery({
    queryKey: ['member-tickets', orgSlug, selectedEmployeeId],
    queryFn: () =>
      fetchMemberTicketsAction({ orgSlug, memberId, targetMemberId: selectedEmployeeId! }),
    enabled: !!orgSlug && !!memberId && !!selectedEmployeeId,
    staleTime: 1000 * 60,
  });
  const tickets = ticketsQuery.data ?? [];

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        memberDisplayName(m).toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q),
    );
  }, [members, employeeQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleEmployeeSelect(member: AssetLookupOption) {
    setSelectedEmployeeId(member.id);
    setSelectedTicketId(null);
    setReplacementMode(null);
    setExpectedReturnDate('');
    setEmployeeQuery(memberDisplayName(member));
    setEmployeeDropdownOpen(false);
  }

  function handleEmployeeInputChange(value: string) {
    setEmployeeQuery(value);
    setEmployeeDropdownOpen(true);
    if (!value) {
      setSelectedEmployeeId(null);
      setSelectedTicketId(null);
      setReplacementMode(null);
      setExpectedReturnDate('');
    }
  }

  function handleClearEmployee() {
    setSelectedEmployeeId(null);
    setEmployeeQuery('');
    setSelectedTicketId(null);
    setReplacementMode(null);
    setExpectedReturnDate('');
    setEmployeeDropdownOpen(false);
    employeeInputRef.current?.focus();
  }

  async function handleProvide() {
    if (!selectedEmployeeId || !selectedTicketId || !replacementMode) return;
    try {
      await mutations.provideReplacement.mutateAsync({
        employeeMemberId: selectedEmployeeId,
        ticketId: selectedTicketId,
        replacementMode,
        expectedReturnDate: replacementMode === 'TEMPORARY_BACKUP' ? expectedReturnDate || null : null,
        notes: notes.trim() || null,
      });
      toast.success('Replacement provided successfully');
      handleReset();
      onOpenChange(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to provide replacement'));
    }
  }

  async function handleRaiseAppraisal() {
    if (!selectedEmployeeId || !selectedTicketId || !replacementMode) return;
    try {
      const result = await mutations.raiseReplacementAppraisal.mutateAsync({
        employeeMemberId: selectedEmployeeId,
        ticketId: selectedTicketId,
        replacementMode,
        notes: notes.trim() || null,
      });
      toast.success(result.message);
      handleReset();
      onOpenChange(false);
    } catch (error) {
      toast.error(readError(error, 'Failed to raise appraisal'));
    }
  }

  function handleReset() {
    setSelectedEmployeeId(null);
    setEmployeeQuery('');
    setSelectedTicketId(null);
    setReplacementMode(null);
    setExpectedReturnDate('');
    setNotes('');
    setEmployeeDropdownOpen(false);
  }

  const canSubmit = !!selectedEmployeeId && !!selectedTicketId && !!replacementMode;
  const isProviding = mutations.provideReplacement.isPending;
  const isRaising = mutations.raiseReplacementAppraisal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 rounded-2xl overflow-hidden" showCloseButton={false}>
        <DialogTitle className="sr-only">Replacement Option</DialogTitle>
        <DialogDescription className="sr-only">Select employee, ticket, and replacement mode to proceed.</DialogDescription>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <RefreshCcw className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">Replacement Option</h2>
            </div>
            <p className="text-sm text-slate-500 pl-10">Select employee, ticket, and replacement mode to proceed.</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form className="p-6 space-y-5 flex-1" onSubmit={(e) => { e.preventDefault(); handleProvide(); }}>

          {/* Select Employee */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Select Employee</label>
            <div className="relative" ref={employeeDropdownRef}>
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                ref={employeeInputRef}
                type="text"
                value={employeeQuery}
                onChange={(e) => handleEmployeeInputChange(e.target.value)}
                onFocus={() => setEmployeeDropdownOpen(true)}
                placeholder="Search employee..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={selectedEmployeeId && employeeQuery ? handleClearEmployee : () => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {selectedEmployeeId && employeeQuery ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>

              {/* Employee Dropdown */}
              {employeeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-60 overflow-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-sm text-slate-400 text-center">No employees found</div>
                  ) : (
                    filteredEmployees.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleEmployeeSelect(member)}
                        className="w-full px-3 py-2.5 text-left hover:bg-slate-50 transition flex flex-col"
                      >
                        <span className="text-[13px] font-medium text-slate-800">
                          {memberDisplayName(member)}
                        </span>
                        {member.email && (
                          <span className="text-[11px] text-slate-400">{member.email}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Select Ticket */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Select Ticket</label>
            {!selectedEmployeeId ? (
              <div className="relative bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-not-allowed">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Ticket className="w-4.5 h-4.5" />
                </span>
                <select disabled className="w-full pl-10 pr-10 py-2.5 bg-transparent appearance-none text-sm font-medium text-slate-400 cursor-not-allowed rounded-xl">
                  <option>Select an employee first</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              </div>
            ) : ticketsQuery.isLoading ? (
              <div className="relative bg-slate-50/60 rounded-xl border border-slate-200/80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Ticket className="w-4.5 h-4.5" />
                </span>
                <select disabled className="w-full pl-10 pr-10 py-2.5 bg-transparent appearance-none text-sm font-medium text-slate-400 rounded-xl">
                  <option>Loading tickets...</option>
                </select>
              </div>
            ) : tickets.length === 0 ? (
              <div className="relative bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-not-allowed">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Ticket className="w-4.5 h-4.5" />
                </span>
                <select disabled className="w-full pl-10 pr-10 py-2.5 bg-transparent appearance-none text-sm font-medium text-slate-400 cursor-not-allowed rounded-xl">
                  <option>No open tickets found</option>
                </select>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Ticket className="w-4.5 h-4.5" />
                </span>
                <select
                  value={selectedTicketId ?? ''}
                  onChange={(e) => {
                    setSelectedTicketId(e.target.value);
                    setReplacementMode(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 appearance-none bg-white"
                >
                  <option value="" disabled>Choose a ticket...</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketId} — {t.issueDescription}
                    </option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
              </div>
            )}
          </div>

          {/* Replacement Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Replacement Mode</label>
            {!selectedTicketId ? (
              <div className="relative bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-not-allowed">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Cog className="w-4.5 h-4.5" />
                </span>
                <select disabled className="w-full pl-10 pr-10 py-2.5 bg-transparent appearance-none text-sm font-medium text-slate-400 cursor-not-allowed rounded-xl">
                  <option>Select a ticket first</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setReplacementMode('PERMANENT_REPLACEMENT'); setExpectedReturnDate(''); }}
                  className={`rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                    replacementMode === 'PERMANENT_REPLACEMENT'
                      ? 'border-[#3862f6] bg-[#f4f8ff]'
                      : 'border-[#eef0f3] bg-white hover:border-[#d1d5db]'
                  }`}
                >
                  <Laptop className="mb-2 size-5 text-[#3862f6]" />
                  <p className="text-[13px] font-semibold text-[#111827]">Permanent</p>
                  <p className="mt-0.5 text-[11px] text-[#6e6e73]">Exact model replacement</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setReplacementMode('TEMPORARY_BACKUP'); }}
                  className={`rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                    replacementMode === 'TEMPORARY_BACKUP'
                      ? 'border-[#d97706] bg-[#fffbeb]'
                      : 'border-[#eef0f3] bg-white hover:border-[#d1d5db]'
                  }`}
                >
                  <RefreshCcw className="mb-2 size-5 text-[#d97706]" />
                  <p className="text-[13px] font-semibold text-[#111827]">Temporary</p>
                  <p className="mt-0.5 text-[11px] text-[#6e6e73]">Loaner / backup unit</p>
                </button>
              </div>
            )}
          </div>

          {/* Expected Return Date (for temporary) */}
          {replacementMode === 'TEMPORARY_BACKUP' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Expected Return Date</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Calendar className="w-4.5 h-4.5" />
                </span>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this replacement..."
              rows={3}
              className="w-full p-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400 text-slate-800 resize-none"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || isProviding || isRaising}
            onClick={handleRaiseAppraisal}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 bg-white text-slate-500 rounded-xl text-sm font-medium hover:text-slate-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRaising ? 'Raising...' : 'Raise Appraisal (Finance)'}
          </button>
          <button
            type="button"
            disabled={!canSubmit || isProviding || isRaising}
            onClick={handleProvide}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isProviding ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Providing...
              </span>
            ) : (
              'Provide Replacement'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
