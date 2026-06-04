'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AttendanceFiltersState,
  AttendanceStatus,
  AttendanceTimePreset,
} from '@/modules/attendance/types/attendanceTypes';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';

interface AttendanceFiltersProps {
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  showMemberFilter: boolean;
  selfScope?: boolean;
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
}: Readonly<AttendanceFiltersProps>) {
  const presetOptions = selfScope ? SELF_PRESET_OPTIONS : PRESET_OPTIONS;
  const neutralPreset: AttendanceTimePreset = selfScope ? 'this_week' : 'all_time';

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
        pageSize: 50,
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
      pageSize: 50,
    });
  }

  const hasActiveFilters =
    filters.timePreset !== neutralPreset ||
    filters.status != null ||
    filters.employeeNameSearch != null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder={showMemberFilter ? "Search employee…" : "Search…"}
          value={filters.employeeNameSearch ?? ''}
          onChange={(e) => update({ employeeNameSearch: e.target.value || undefined })}
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
  );
}
