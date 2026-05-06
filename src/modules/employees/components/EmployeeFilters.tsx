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
  EmployeeFilterOption,
  AttendanceTodayStatus,
} from '@/modules/employees/types/employeeTypes';

interface EmployeeFiltersProps {
  search: string;
  departmentId: string | undefined;
  roleId: string | undefined;
  attendanceStatus: AttendanceTodayStatus | undefined;
  departments: EmployeeFilterOption[];
  roles: EmployeeFilterOption[];
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string | undefined) => void;
  onRoleChange: (value: string | undefined) => void;
  onAttendanceStatusChange: (value: AttendanceTodayStatus | undefined) => void;
  onClearAll: () => void;
}

const ATTENDANCE_OPTIONS: { value: AttendanceTodayStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'WORK_FROM_HOME', label: 'Work From Home' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'NO_RECORD', label: 'No Record' },
];

const ALL_VALUE = '__all__';

export function EmployeeFilters({
  search,
  departmentId,
  roleId,
  attendanceStatus,
  departments,
  roles,
  onSearchChange,
  onDepartmentChange,
  onRoleChange,
  onAttendanceStatusChange,
  onClearAll,
}: EmployeeFiltersProps) {
  const hasActiveFilters =
    search || departmentId || roleId || attendanceStatus;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-neutral-50 border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
        />
      </div>

      {/* Department filter */}
      <Select
        value={departmentId ?? ALL_VALUE}
        onValueChange={(v) => onDepartmentChange(v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger className="h-9 w-[180px] text-sm border-neutral-200">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE} className="text-sm">
            All Departments
          </SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id} className="text-sm">
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Role filter */}
      <Select
        value={roleId ?? ALL_VALUE}
        onValueChange={(v) => onRoleChange(v === ALL_VALUE ? undefined : v)}
      >
        <SelectTrigger className="h-9 w-[160px] text-sm border-neutral-200">
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

      {/* Attendance status filter */}
      <Select
        value={attendanceStatus ?? ALL_VALUE}
        onValueChange={(v) =>
          onAttendanceStatusChange(
            v === ALL_VALUE ? undefined : (v as AttendanceTodayStatus),
          )
        }
      >
        <SelectTrigger className="h-9 w-[180px] text-sm border-neutral-200">
          <SelectValue placeholder="All Attendance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE} className="text-sm">
            All Attendance
          </SelectItem>
          {ATTENDANCE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-sm">
              {o.label}
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
  );
}
