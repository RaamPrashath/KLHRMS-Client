'use client';

import { Import, Loader2, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useImportOptionsQuery } from '@/modules/jobs/hooks/usePipelineMutations';

interface ImportJobSelectorProps {
  open: boolean;
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  importingJobId: string | null;
  onOpenChange: (open: boolean) => void;
  onImport: (sourceJobPostingId: string) => void;
}

export function ImportJobSelector({
  open,
  orgSlug,
  memberId,
  requisitionId,
  importingJobId,
  onOpenChange,
  onImport,
}: Readonly<ImportJobSelectorProps>) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const optionsQuery = useImportOptionsQuery(orgSlug, memberId, requisitionId);

  const filteredOptions = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const options = optionsQuery.data ?? [];
    if (!query) return options;
    return options.filter((option) =>
      [option.title, option.departmentName].filter(Boolean).join(' ').toLowerCase().includes(query),
    );
  }, [deferredSearch, optionsQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-ghost text-primary">
            <Import className="size-5" />
          </div>
          <DialogTitle>Import from existing job</DialogTitle>
          <DialogDescription>
            Copy the stage setup from another approved job posting.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search jobs"
            className="bg-neutral-50 pl-9"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-neutral-100">
          {optionsQuery.isLoading ? (
            <div className="space-y-3 p-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : null}

          {!optionsQuery.isLoading && filteredOptions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-neutral-700">No other jobs available</p>
              <p className="mt-1 text-sm text-neutral-500">Create stages manually for this requisition.</p>
            </div>
          ) : null}

          {!optionsQuery.isLoading && filteredOptions.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {filteredOptions.map((option) => {
                const isImporting = importingJobId === option.id;
                const disabled = option.stageCount === 0 || importingJobId !== null;
                return (
                  <div key={option.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{option.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {option.departmentName ?? 'No department'} - {option.stageCount} importable stages
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={option.stageCount === 0 ? 'outline' : 'default'}
                      disabled={disabled}
                      onClick={() => onImport(option.id)}
                    >
                      {isImporting ? <Loader2 className="size-4 animate-spin" /> : <Import className="size-4" />}
                      Import
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
