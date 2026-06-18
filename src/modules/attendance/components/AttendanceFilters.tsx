'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AttendanceFiltersState,
  AttendanceStatus,
  AttendanceTimePreset,
} from '@/modules/attendance/types/attendanceTypes';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import { useDebounce } from '@/hooks/useDebounce';

interface AttendanceFiltersProps {
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  showMemberFilter: boolean;
  selfScope?: boolean;
  exportButtons?: React.ReactNode;
}

function getMondayOfWeekIST(): Date {
  const parts = getTodayIST().split('-').map(Number);
  const today = new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const dow = today.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  today.setDate(today.getDate() - offset);
  return today;
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: AttendanceTimePreset): {
  dateFrom: string | undefined;
  dateTo: string | undefined;
} {
  const today = getTodayIST();

  if (preset === 'today') {
    return { dateFrom: today, dateTo: today };
  }

  if (preset === 'yesterday') {
    const parts = today.split('-').map(Number);
    const d = new Date(parts[0]!, (parts[1] ?? 1) - 1, (parts[2] ?? 1) - 1);
    return { dateFrom: toYmdLocal(d), dateTo: toYmdLocal(d) };
  }

  if (preset === 'this_week') {
    const monday = getMondayOfWeekIST();
    return { dateFrom: toYmdLocal(monday), dateTo: today };
  }

  if (preset === 'last_calendar_week') {
    const thisMonday = getMondayOfWeekIST();
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(lastSunday.getDate() - 1);
    return { dateFrom: toYmdLocal(lastMonday), dateTo: toYmdLocal(lastSunday) };
  }

  if (preset === 'last_week') {
    const parts = today.split('-').map(Number);
    const end = new Date(parts[0]!, (parts[1] ?? 1) - 1, (parts[2] ?? 1) - 1);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { dateFrom: toYmdLocal(start), dateTo: toYmdLocal(end) };
  }

  if (preset === 'last_month') {
    const parts = today.split('-').map(Number);
    const end = new Date(parts[0]!, (parts[1] ?? 1) - 1, (parts[2] ?? 1) - 1);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { dateFrom: toYmdLocal(start), dateTo: toYmdLocal(end) };
  }

  return { dateFrom: undefined, dateTo: undefined };
}

const ALL_VALUE = '__all__';

const PRESET_OPTIONS: { value: AttendanceTimePreset; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last 7 Days' },
  { value: 'last_month', label: 'Last 30 Days' },
];

const SELF_PRESET_OPTIONS: { value: AttendanceTimePreset; label: string }[] = [
  { value: 'all_time', label: 'All Time' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_calendar_week', label: 'Last Week' },
];

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ABSENT', label: 'Absent' },
];

export function AttendanceFilters({
  filters,
  onFiltersChange,
  showMemberFilter,
  selfScope = false,
  exportButtons,
}: Readonly<AttendanceFiltersProps>) {
  const presetOptions = selfScope ? SELF_PRESET_OPTIONS : PRESET_OPTIONS;
  const neutralPreset: AttendanceTimePreset = selfScope ? 'this_week' : 'all_time';

  const [searchInput, setSearchInput] = useState<string>(filters.employeeNameSearch ?? '');
  const debouncedSearch = useDebounce(searchInput, 350);

  useEffect(() => {
    const next = debouncedSearch || undefined;
    if (next === filters.employeeNameSearch) return;
    onFiltersChange({ ...filters, employeeNameSearch: next, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function update(patch: Partial<AttendanceFiltersState>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  function handlePresetChange(value: string) {
    if (value === ALL_VALUE) {
      const range = getPresetRange('all_time');
      update({ timePreset: 'all_time', ...range });
    } else {
      const preset = value as AttendanceTimePreset;
      const range = getPresetRange(preset);
      update({ timePreset: preset, ...range });
    }
  }

  function handleClear() {
    if (selfScope) {
      const range = getPresetRange('this_week');
      onFiltersChange({
        timePreset: 'this_week',
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        status: undefined,
        targetMemberId: undefined,
        employeeNameSearch: undefined,
        page: 1,
        pageSize: 15,
      });
      return;
    }
    onFiltersChange({
      timePreset: 'all_time',
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      targetMemberId: undefined,
      employeeNameSearch: undefined,
      page: 1,
      pageSize: 15,
    });
  }

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [tempTimePreset, setTempTimePreset] = useState<AttendanceTimePreset>(filters.timePreset);
  const [tempStatus, setTempStatus] = useState<AttendanceStatus | undefined>(filters.status);

  function handleOpenMobileFilters() {
    setTempTimePreset(filters.timePreset === 'custom' ? 'all_time' : filters.timePreset);
    setTempStatus(filters.status);
    setIsMobileOpen(true);
  }

  function handleApplyMobileFilters() {
    const range = getPresetRange(tempTimePreset);
    onFiltersChange({
      ...filters,
      timePreset: tempTimePreset,
      status: tempStatus,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      page: 1,
    });
    setIsMobileOpen(false);
  }

  function handleClearMobileFilters() {
    setTempTimePreset(neutralPreset);
    setTempStatus(undefined);
    const range = getPresetRange(neutralPreset);
    onFiltersChange({
      ...filters,
      timePreset: neutralPreset,
      status: undefined,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      page: 1,
    });
    setIsMobileOpen(false);
  }

  const hasActiveFilters =
    filters.timePreset !== neutralPreset ||
    filters.status != null ||
    filters.employeeNameSearch != null;

  return (
    <>
      {/* Desktop View: Search + Side-by-side select triggers */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <Input
            placeholder={selfScope ? "Search logs…" : showMemberFilter ? "Search employee…" : "Search…"}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={filters.timePreset === 'custom' ? 'all_time' : filters.timePreset}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="h-9 w-[150px] text-sm border-0 bg-canvas">
              <SelectValue placeholder={selfScope ? 'This Week' : 'All Time'} />
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? ALL_VALUE}
            onValueChange={(v) => update({ status: v === ALL_VALUE ? undefined : (v as AttendanceStatus) })}
          >
            <SelectTrigger className="h-9 w-[140px] text-sm border-0 bg-canvas">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE} className="text-sm">All Status</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
            >
              <X className="size-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mobile View: Search + Single Filter Button */}
      <div className="flex md:hidden items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <Input
            placeholder={selfScope ? "Search logs…" : showMemberFilter ? "Search employee…" : "Search…"}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm h-9"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenMobileFilters}
          className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-neutral-200 bg-surface text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 shrink-0 select-none active:scale-[0.97] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="size-3.5 mr-1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-1.5 flex h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
          )}
        </button>
        {exportButtons}
      </div>

      {/* Mobile Filters Dialog */}
      <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-center">Filter Attendance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Time Preset */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-zinc-500">
                Date Range
              </label>
              <Select
                value={tempTimePreset}
                onValueChange={(val) => setTempTimePreset(val as AttendanceTimePreset)}
              >
                <SelectTrigger className="h-10 w-full text-sm border bg-canvas">
                  <SelectValue placeholder={selfScope ? 'This Week' : 'All Time'} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {presetOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400 dark:text-zinc-500">
                Status
              </label>
              <Select
                value={tempStatus ?? ALL_VALUE}
                onValueChange={(v) => setTempStatus(v === ALL_VALUE ? undefined : (v as AttendanceStatus))}
              >
                <SelectTrigger className="h-10 w-full text-sm border bg-canvas">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value={ALL_VALUE} className="text-sm">All Status</SelectItem>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-2 mt-4 sm:justify-end">
            <button
              type="button"
              onClick={handleClearMobileFilters}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-neutral-200 bg-surface text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 active:scale-[0.98] transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApplyMobileFilters}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
