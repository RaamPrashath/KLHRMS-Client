import { CalendarDays } from 'lucide-react';

interface BulkAttendanceEmptyStateProps {
  onAddLog?: () => void;
}

export function BulkAttendanceEmptyState({ onAddLog }: Readonly<BulkAttendanceEmptyStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="size-14 rounded-full bg-primary-ghost flex items-center justify-center">
        <CalendarDays className="size-7 text-primary" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-900">No work logs this week</p>
        <p className="text-xs text-neutral-500 mt-1">
          Click the <span className="font-medium text-neutral-700">+</span> button on any day to add your first work log.
        </p>
      </div>
      {onAddLog && (
        <button
          type="button"
          onClick={onAddLog}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-md transition-colors duration-100"
        >
          Add work log
        </button>
      )}
    </div>
  );
}
