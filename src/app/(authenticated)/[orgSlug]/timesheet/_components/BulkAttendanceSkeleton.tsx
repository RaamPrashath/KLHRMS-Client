import { Skeleton } from '@/components/ui/skeleton';

export function BulkAttendanceSkeleton() {
  return (
    <div className="flex flex-col gap-6 flex-1 h-full bg-background">
      {/* Header skeleton */}
      <div className="ml-7 mt-7 mr-7 shrink-0">
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Card skeleton */}
      <div className="mx-7 mb-7 bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1 min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-t border-border">
          <div className="border-r border-border p-3" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="p-3 border-r border-border last:border-r-0">
              <Skeleton className="h-4 w-12 mb-1" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>

        {/* Time grid rows */}
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="grid grid-cols-8 border-b border-border last:border-b-0">
            <div className="border-r border-border p-2 flex items-start justify-end pr-3">
              <Skeleton className="h-3 w-10" />
            </div>
            {Array.from({ length: 7 }, (_, j) => (
              <div key={j} className="border-r border-border last:border-r-0 h-12" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
