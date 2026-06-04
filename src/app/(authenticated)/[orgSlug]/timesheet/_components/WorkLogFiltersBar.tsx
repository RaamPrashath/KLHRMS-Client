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
  employeeName: string;
  employeeSuggestions: Option[];
  departmentOptions: Option[];
  onPresetChange: (value: WorkLogPreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onEmployeeNameChange: (value: string) => void;
}

export function WorkLogFiltersBar({
  preset,
  dateFrom,
  dateTo,
  departmentId,
  employeeName,
  employeeSuggestions,
  departmentOptions,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onDepartmentChange,
  onEmployeeNameChange,
}: Readonly<WorkLogFiltersBarProps>) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as WorkLogPreset)}>
        <SelectTrigger className="h-11 w-[130px] rounded-xl border-border/60 bg-background shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last7">Last 7 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-11 w-[170px] rounded-xl border-border/60 bg-background shadow-none"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-11 w-[170px] rounded-xl border-border/60 bg-background shadow-none"
          />
        </>
      )}

      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger className="h-11 w-[200px] rounded-xl border-border/60 bg-background shadow-none">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          {departmentOptions.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="max-w-md">
        <Input
          value={employeeName}
          onChange={(event) => onEmployeeNameChange(event.target.value)}
          placeholder="Search employee"
          list="work-log-employee-suggestions"
          className="h-11 rounded-xl border-border/60 bg-background shadow-none"
        />
        <datalist id="work-log-employee-suggestions">
          {employeeSuggestions.map((option) => (
            <option key={option.id} value={option.label} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
