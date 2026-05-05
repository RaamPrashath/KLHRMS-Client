'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  AttendanceFiltersState,
  AttendanceStatus,
  AttendanceTimePreset,
} from '@/modules/attendance/types/attendanceTypes';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';

// ─── Preset date range resolver ───────────────────────────────────────────────

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
    end.setDate(end.getDate() - 1); // yesterday
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

  // all_time or custom — no date bounds
  return { dateFrom: undefined, dateTo: undefined };
}

// ─── Preset button labels ─────────────────────────────────────────────────────

const PRESETS: { value: AttendanceTimePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last 7 days' },
  { value: 'last_month', label: 'Last 30 days' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttendanceFiltersProps {
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  /** Show employee name search — only for org-scope (manager) views */
  showMemberFilter: boolean;
}

const DEFAULT_FILTERS: AttendanceFiltersState = {
  timePreset: 'today',
  dateFrom: getTodayIST(),
  dateTo: getTodayIST(),
  status: undefined,
  targetMemberId: undefined,
  employeeNameSearch: undefined,
  page: 1,
  pageSize: 20,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceFilters({
  filters,
  onFiltersChange,
  showMemberFilter,
}: Readonly<AttendanceFiltersProps>) {
  function update(patch: Partial<AttendanceFiltersState>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  function handlePresetChange(preset: AttendanceTimePreset) {
    const range = getPresetRange(preset);
    update({ timePreset: preset, ...range });
  }

  function handleClear() {
    onFiltersChange({ ...DEFAULT_FILTERS });
  }

  const hasExtraFilters =
    filters.status != null ||
    filters.employeeNameSearch != null;

  const isCustom = filters.timePreset === 'custom';

  return (
    <div className="flex flex-col gap-3">
      {/* ── Time preset pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePresetChange(p.value)}
            className={cn(
              'h-7 px-3 text-[12px] font-medium rounded-full border transition-all duration-150',
              filters.timePreset === p.value
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-surface text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:text-neutral-900',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Secondary filters row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Custom date range — only shown when preset is "custom" */}
        {isCustom && (
          <>
            <Input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => update({ dateFrom: e.target.value || undefined })}
              className="h-8 w-[130px] text-xs bg-surface border-neutral-200 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
              aria-label="From date"
            />
            <span className="text-neutral-300 text-xs select-none">–</span>
            <Input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => update({ dateTo: e.target.value || undefined })}
              className="h-8 w-[130px] text-xs bg-surface border-neutral-200 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
              aria-label="To date"
            />
            <div className="w-px h-4 bg-neutral-200 hidden sm:block" />
          </>
        )}

        {/* Status filter */}
        <Select
          value={filters.status ?? 'ALL'}
          onValueChange={(val) =>
            update({ status: val === 'ALL' ? undefined : (val as AttendanceStatus) })
          }
        >
          <SelectTrigger className="h-8 w-[110px] text-xs bg-surface border-neutral-200 shadow-sm focus:ring-1 focus:ring-primary/20 rounded-md">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
          </SelectContent>
        </Select>

        {/* Employee name search — org-scope only */}
        {showMemberFilter && (
          <>
            <div className="w-px h-4 bg-neutral-200 hidden sm:block" />
            <Input
              type="text"
              placeholder="Search employee…"
              value={filters.employeeNameSearch ?? ''}
              onChange={(e) =>
                update({ employeeNameSearch: e.target.value || undefined })
              }
              className="h-8 w-[180px] text-xs bg-surface border-neutral-200 shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20 rounded-md"
              aria-label="Search by employee name"
            />
          </>
        )}

        {/* Clear extra filters */}
        {hasExtraFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="h-8 px-2.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
