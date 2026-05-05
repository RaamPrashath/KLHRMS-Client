'use client';

import { Filter, Search } from 'lucide-react';
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

  return (
    <div className="flex flex-col gap-3">
      {/* ── Main filters row ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePresetChange(p.value)}
              className={cn(
                'h-8 px-3.5 text-[13px] font-medium rounded-lg transition-all duration-200 ease-out border',
                filters.timePreset === p.value
                  ? 'bg-[#00874A] text-white border-[#00874A] shadow-sm'
                  : 'bg-white text-neutral-500 border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:text-neutral-900 hover:bg-neutral-50 hover:border-black/[0.08]',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Employee name search — org-scope only */}
          {showMemberFilter && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search employee…"
                value={filters.employeeNameSearch ?? ''}
                onChange={(e) =>
                  update({ employeeNameSearch: e.target.value || undefined })
                }
                className="h-8 w-[180px] pl-8 text-[13px] bg-white border border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus-visible:ring-1 focus-visible:ring-[#00874A]/20 rounded-lg text-neutral-700 placeholder:text-neutral-400"
                aria-label="Search by employee name"
              />
            </div>
          )}

          {/* Status filter */}
          <Select
            value={filters.status ?? 'ALL'}
            onValueChange={(val) =>
              update({ status: val === 'ALL' ? undefined : (val as AttendanceStatus) })
            }
          >
            <SelectTrigger className="h-8 w-[120px] text-[13px] bg-white border border-black/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:ring-1 focus:ring-[#00874A]/20 rounded-lg text-neutral-700">
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-neutral-400" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="text-[13px] border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PRESENT">Present</SelectItem>
              <SelectItem value="HALF_DAY">Half Day</SelectItem>
              <SelectItem value="ABSENT">Absent</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear extra filters */}
          {hasExtraFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="h-8 px-3 text-[13px] font-medium text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors duration-150"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
