import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceStatusCardProps {
  label: string;
  value: string | number;
  isLoading?: boolean;
}

export function AttendanceStatusCard({
  label,
  value,
  isLoading,
}: Readonly<AttendanceStatusCardProps>) {
  return (
    <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) p-6">
      {isLoading ? (
        <>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-16 mt-1" />
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{value}</p>
        </>
      )}
    </div>
  );
}
