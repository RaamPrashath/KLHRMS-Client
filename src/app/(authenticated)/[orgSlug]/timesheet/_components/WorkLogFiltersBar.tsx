'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type WorkLogPreset = 'today' | 'last7' | 'custom';

interface Option {
  id: string;
  label: string;
}

interface WorkLogFiltersBarProps {
  preset: WorkLogPreset;
  dateFrom: string;
  dateTo: string;
  departmentId: string;
  teamId: string;
  employeeName: string;
  employeeSuggestions: Option[];
  departmentOptions: Option[];
  teamOptions: Option[];
  onPresetChange: (value: WorkLogPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onEmployeeNameChange: (value: string) => void;
}

const ALL_VALUE = 'ALL';

export function WorkLogFiltersBar({
  preset,
  dateFrom,
  dateTo,
  departmentId,
  teamId,
  employeeName,
  employeeSuggestions,
  departmentOptions,
  teamOptions,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onDepartmentChange,
  onTeamChange,
  onEmployeeNameChange,
}: Readonly<WorkLogFiltersBarProps>) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 xl:grid-cols-[180px_1fr_180px_180px]">
        <Select value={preset} onValueChange={(value) => onPresetChange(value as WorkLogPreset)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            type="date"
            disabled={preset !== 'custom'}
            className="h-10 rounded-xl"
          />
          <Input
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            type="date"
            disabled={preset !== 'custom'}
            className="h-10 rounded-xl"
          />
        </div>

        <Select value={departmentId || ALL_VALUE} onValueChange={(value) => onDepartmentChange(value === ALL_VALUE ? '' : value)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Departments</SelectItem>
            {departmentOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamId || ALL_VALUE} onValueChange={(value) => onTeamChange(value === ALL_VALUE ? '' : value)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Teams</SelectItem>
            {teamOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)]">
        <div>
          <Input
            value={employeeName}
            onChange={(event) => onEmployeeNameChange(event.target.value)}
            placeholder="Search employee"
            list="work-log-employee-suggestions"
            className="h-10 rounded-xl"
          />
          <datalist id="work-log-employee-suggestions">
            {employeeSuggestions.map((option) => (
              <option key={option.id} value={option.label} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
