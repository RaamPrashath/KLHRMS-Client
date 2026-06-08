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
import type { AttendanceTodayStatus, EmployeeFilterOption } from '@/modules/employees/types/employeeTypes';

const ATTENDANCE_OPTIONS: { value: AttendanceTodayStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'WORK_FROM_HOME', label: 'WFH' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'NO_RECORD', label: 'No Record' },
];

interface EmployeeFiltersProps {
  search: string;
  roleId: string | undefined;
  attendanceStatus: AttendanceTodayStatus | undefined;
  roles: EmployeeFilterOption[];
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onRoleChange: (value: string | undefined) => void;
  onAttendanceStatusChange: (value: AttendanceTodayStatus | undefined) => void;
  onClearAll: () => void;
}

const ALL_VALUE = '__all__';

export function EmployeeFilters({
  search,
  roleId,
  attendanceStatus,
  roles,
  onSearchChange,
  onClearSearch,
  onRoleChange,
  onAttendanceStatusChange,
  onClearAll,
}: EmployeeFiltersProps) {
  const hasActiveFilters = !!roleId || !!attendanceStatus;

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Search — stretches to fill space left of the selects */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder="Search by name, email, employee ID, department, or role"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
        />
      </div>

      {/* Right-aligned controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Attendance status filter */}
        <Select
          value={attendanceStatus ?? ALL_VALUE}
          onValueChange={(v) => onAttendanceStatusChange(v === ALL_VALUE ? undefined : v as AttendanceTodayStatus)}
        >
          <SelectTrigger className="h-9 w-36 text-sm border-0 bg-canvas">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE} className="text-sm">
              All Status
            </SelectItem>
            {ATTENDANCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Role filter */}
        <Select
          value={roleId ?? ALL_VALUE}
          onValueChange={(v) => onRoleChange(v === ALL_VALUE ? undefined : v)}
        >
          <SelectTrigger className="h-9 w-40 text-sm border-0 bg-canvas">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE} className="text-sm">
              All Roles
            </SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-sm">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
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
