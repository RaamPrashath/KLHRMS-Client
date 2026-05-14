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
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const ymd = d.toISOString().slice(0, 10);
    return { dateFrom: ymd, dateTo: ymd };
  }

  if (preset === 'last_week') {
    const end = new Date(today);
    end.setDate(end.getDate() - 1);
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: end.toISOString().slice(0, 10),
    };
  }

  if (preset === 'last_month') {
    const end = new Date(today);
    end.setDate(end.getDate() - 1);
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    return {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: end.toISOString().slice(0, 10),
    };
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

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ABSENT', label: 'Absent' },
];

export function AttendanceFilters({
  filters,
  onFiltersChange,
  showMemberFilter,
}: Readonly<AttendanceFiltersProps>) {
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
    onFiltersChange({
      timePreset: 'all_time',
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      targetMemberId: undefined,
      employeeNameSearch: undefined,
      page: 1,
      pageSize: 20,
    });
  }

  const hasActiveFilters =
    filters.timePreset !== 'all_time' ||
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
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_OPTIONS.map((o) => (
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
