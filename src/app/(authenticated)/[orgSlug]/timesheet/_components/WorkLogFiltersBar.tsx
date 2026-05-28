'use client';

import { Input } from '@/components/ui/input';

interface Option {
  id: string;
  label: string;
}

interface WorkLogFiltersBarProps {
  employeeName: string;
  employeeSuggestions: Option[];
  onEmployeeNameChange: (value: string) => void;
}

export function WorkLogFiltersBar({
  employeeName,
  employeeSuggestions,
  onEmployeeNameChange,
}: Readonly<WorkLogFiltersBarProps>) {
  return (
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
  );
}
