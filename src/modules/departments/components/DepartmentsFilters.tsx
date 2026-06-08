'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DepartmentsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onClearAll: () => void;
}

export function DepartmentsFilters({
  search,
  onSearchChange,
  onClearAll,
}: DepartmentsFiltersProps) {
  const hasActiveFilters = search.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-[280px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search Departments"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 border-0 bg-canvas px-3 py-2.5 pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
        >
          <X className="size-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
