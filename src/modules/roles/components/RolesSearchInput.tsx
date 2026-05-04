'use client';

import { Search, X } from 'lucide-react';

export interface RolesSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function RolesSearchInput({ value, onChange }: Readonly<RolesSearchInputProps>) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search roles…"
        aria-label="Search roles"
        className="
          w-full
          bg-neutral-50 border border-transparent rounded-md
          pl-9 pr-8 py-2
          text-sm font-sans text-neutral-900
          placeholder:text-neutral-400
          focus:bg-surface focus:border-primary focus:outline-none
          focus:ring-[3px] focus:ring-primary/10
          transition-all duration-150 motion-reduce:transition-none
        "
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="
            absolute right-2.5 top-1/2 -translate-y-1/2
            size-5 flex items-center justify-center rounded
            text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100
            transition-colors duration-100 motion-reduce:transition-none
          "
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
