import { Skeleton } from '@/components/ui/skeleton';

export function BulkAttendanceSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Calendar skeleton */}
      <div className="bg-surface border border-neutral-100 rounded-xl overflow-hidden shadow-[var(--shadow-1)]">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-neutral-100">
          <div className="border-r border-neutral-100 p-3" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="p-3 border-r border-neutral-100 last:border-r-0">
              <Skeleton className="h-4 w-12 mb-1" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>

        {/* Time grid rows */}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="grid grid-cols-8 border-b border-neutral-100 last:border-b-0">
            <div className="border-r border-neutral-100 p-2 flex items-start justify-end pr-3">
              <Skeleton className="h-3 w-10" />
            </div>
            {Array.from({ length: 7 }, (_, j) => (
              <div key={j} className="border-r border-neutral-100 last:border-r-0 h-12" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
