import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StageWorkspaceSkeletonVariant = 'interview' | 'offer' | 'accepted' | 'onboarding';

interface StageWorkspaceSkeletonProps {
  readonly variant: StageWorkspaceSkeletonVariant;
}

interface PageHeaderSkeletonProps {
  readonly showAction?: boolean;
  readonly showCandidateCount?: boolean;
  readonly actionWidthClassName?: string;
}

const SKELETON_TABLE_ROWS = [0, 1, 2, 3, 4];

function HeaderSkeleton({
  showAction = false,
  showCandidateCount = true,
  actionWidthClassName = 'w-40',
}: PageHeaderSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 ml-7 mt-7 mr-7 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Skeleton className="mt-1.5 size-8 rounded-md" />
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-10 w-56 max-w-[56vw]" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-36" />
            {showCandidateCount ? (
              <>
                <Skeleton className="size-1 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {showAction ? (
        <Skeleton className={cn('h-9 rounded-lg lg:mt-1.5', actionWidthClassName)} />
      ) : null}
    </div>
  );
}

function TableRowSkeleton({
  columns,
  withCheckbox = false,
}: {
  readonly columns: string[];
  readonly withCheckbox?: boolean;
}) {
  return (
    <div className="flex items-center border-b border-neutral-100 px-6 py-4 last:border-b-0">
      {withCheckbox ? (
        <div className="w-10 shrink-0">
          <Skeleton className="size-4 rounded" />
        </div>
      ) : null}
      {columns.map((width, index) => (
        <div key={`${width}-${index}`} className={cn('shrink-0 px-3', width)}>
          <Skeleton className={cn('h-4', index === 0 ? 'w-28' : 'w-20')} />
          {index === 0 ? <Skeleton className="mt-2 h-3 w-36" /> : null}
        </div>
      ))}
    </div>
  );
}

function OfferSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 bg-canvas">
      <HeaderSkeleton showAction actionWidthClassName="w-44" showCandidateCount={false} />

      <div className="mx-7 mb-7 flex flex-1 flex-col">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-3 border-b border-neutral-100 px-3.5 py-3.5">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
          <div className="flex items-center border-b border-neutral-100 bg-canvas/50 px-6 py-3">
            <Skeleton className="size-4 rounded" />
            {['w-[30%]', 'w-[15%]', 'w-[15%]', 'w-[15%]', 'w-[15%]'].map((width, index) => (
              <div key={`${width}-${index}`} className={cn('shrink-0 px-3', width)}>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          {SKELETON_TABLE_ROWS.map((row) => (
            <TableRowSkeleton
              key={row}
              withCheckbox
              columns={['w-[30%]', 'w-[15%]', 'w-[15%]', 'w-[15%]', 'w-[15%]']}
            />
          ))}
          <div className="mt-auto flex items-center justify-between border-t border-neutral-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-8 w-[72px] rounded-md" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AcceptedSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 bg-canvas pb-7">
      <HeaderSkeleton showAction actionWidthClassName="w-52" />

      <div className="mx-7 flex flex-1 flex-col">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-1)]">
          <div className="border-b border-neutral-100 px-3.5 py-3.5">
            <Skeleton className="h-9 w-full max-w-[280px] rounded-md" />
          </div>
          <div className="flex items-center border-b border-neutral-100 bg-canvas/50 px-6 py-3">
            <Skeleton className="mr-6 size-4 rounded" />
            {['w-[14%]', 'w-[24%]', 'w-[32%]', 'w-[16%]', 'w-[14%]'].map((width, index) => (
              <div key={`${width}-${index}`} className={cn('shrink-0 px-3', width)}>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          {SKELETON_TABLE_ROWS.map((row) => (
            <TableRowSkeleton
              key={row}
              withCheckbox
              columns={['w-[14%]', 'w-[24%]', 'w-[32%]', 'w-[16%]', 'w-[14%]']}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 bg-canvas pb-7">
      <HeaderSkeleton />

      <div className="mx-7 flex flex-1 flex-col">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-1)]">
          <div className="border-b border-neutral-100 px-3.5 py-3.5">
            <Skeleton className="h-9 w-full max-w-[280px] rounded-md" />
          </div>
          <div className="flex items-center border-b border-neutral-100 bg-canvas/50 px-6 py-3">
            {['w-[24%]', 'w-[18%]', 'w-[20%]', 'w-[24%]', 'w-[14%]'].map((width, index) => (
              <div key={`${width}-${index}`} className={cn('shrink-0 px-3 first:pl-0', width)}>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          {SKELETON_TABLE_ROWS.map((row) => (
            <TableRowSkeleton
              key={row}
              columns={['w-[24%]', 'w-[18%]', 'w-[20%]', 'w-[24%]', 'w-[14%]']}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function InterviewColumnSkeleton({ muted = false }: { readonly muted?: boolean }) {
  return (
    <div className="flex w-[320px] shrink-0 flex-col px-2 pt-2">
      <div className={cn('mb-3 rounded-xl px-3 py-2 shadow-[var(--shadow-1)]', muted ? 'border border-dashed border-neutral-200 bg-neutral-50/80' : 'bg-surface')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-5 w-7 rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-1)]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-4">
          <Skeleton className="mx-auto h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function InterviewSkeleton() {
  return (
    <div className="min-h-full bg-canvas px-6 sm:px-8">
      <div className="mb-6">
        <div className="mt-7 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-8 rounded-md" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-64 max-w-[58vw]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="size-1 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <div className="flex items-center gap-1 rounded-xl border border-neutral-100 bg-neutral-50 p-1">
            <Skeleton className="h-8 w-14 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-32 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
        </div>

        <div className="flex min-h-0 items-stretch overflow-hidden">
          <InterviewColumnSkeleton muted />
          <div className="border-r border-neutral-200/70" />
          <InterviewColumnSkeleton />
          <div className="border-r border-neutral-200/70" />
          <InterviewColumnSkeleton />
        </div>
      </div>
    </div>
  );
}

export function StageWorkspaceSkeleton({ variant }: StageWorkspaceSkeletonProps) {
  if (variant === 'offer') return <OfferSkeleton />;
  if (variant === 'accepted') return <AcceptedSkeleton />;
  if (variant === 'onboarding') return <OnboardingSkeleton />;
  return <InterviewSkeleton />;
}
