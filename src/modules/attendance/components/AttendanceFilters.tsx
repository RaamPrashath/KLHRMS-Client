'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AttendanceFiltersState, AttendanceStatus } from '@/modules/attendance/types/attendanceTypes';

interface AttendanceFiltersProps {
  filters: AttendanceFiltersState;
  onFiltersChange: (f: AttendanceFiltersState) => void;
  showMemberFilter: boolean;
}

const DEFAULT_FILTERS: AttendanceFiltersState = {
  dateFrom: undefined,
  dateTo: undefined,
  status: undefined,
  targetMemberId: undefined,
  page: 1,
  pageSize: 20,
};

export function AttendanceFilters({
  filters,
  onFiltersChange,
  showMemberFilter,
}: Readonly<AttendanceFiltersProps>) {
  function update(patch: Partial<AttendanceFiltersState>) {
    onFiltersChange({ ...filters, ...patch, page: 1 });
  }

  function handleClear() {
    onFiltersChange({ ...DEFAULT_FILTERS, pageSize: filters.pageSize });
  }

  const hasActiveFilters =
    filters.dateFrom != null ||
    filters.dateTo != null ||
    filters.status != null ||
    filters.targetMemberId != null;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Date From */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-date-from" className="text-xs text-neutral-500">
          From
        </Label>
        <Input
          id="filter-date-from"
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className="h-9 w-36 text-sm"
        />
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-date-to" className="text-xs text-neutral-500">
          To
        </Label>
        <Input
          id="filter-date-to"
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className="h-9 w-36 text-sm"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-status" className="text-xs text-neutral-500">
          Status
        </Label>
        <Select
          value={filters.status ?? 'ALL'}
          onValueChange={(val) =>
            update({ status: val === 'ALL' ? undefined : (val as AttendanceStatus) })
          }
        >
          <SelectTrigger id="filter-status" className="h-9 w-36 text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee name search — org-scope only, no raw ID input */}
      {showMemberFilter && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="filter-employee-name" className="text-xs text-neutral-500">
            Employee
          </Label>
          <Input
            id="filter-employee-name"
            type="text"
            placeholder="Search by name"
            value={filters.targetMemberId ?? ''}
            onChange={(e) => update({ targetMemberId: e.target.value || undefined })}
            className="h-9 w-44 text-sm"
          />
        </div>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="h-9 px-3 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-md border border-neutral-200 transition-colors duration-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}
