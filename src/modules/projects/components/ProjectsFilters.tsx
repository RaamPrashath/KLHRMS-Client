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
import type { ProjectStatus } from '@/modules/projects/types/projectTypes';

interface ProjectsFiltersProps {
  search: string;
  statusFilter: ProjectStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus | 'ALL') => void;
  onClearAll: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function ProjectsFilters({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onClearAll,
}: ProjectsFiltersProps) {
  const hasActiveFilters = search || statusFilter !== 'ALL';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder="Search projects…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusChange(v as ProjectStatus | 'ALL')}
        >
          <SelectTrigger className="h-9 w-[160px] text-sm border-0 bg-canvas">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
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
