interface AttendanceEmptyStateProps {
  message?: string;
}

export function AttendanceEmptyState({
  message = 'No attendance records found.',
}: Readonly<AttendanceEmptyStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div
        className="bg-neutral-50 border border-neutral-200 rounded-xl size-12 flex items-center justify-center"
        role="img"
        aria-label="No records"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">No records</p>
        <p className="text-xs text-neutral-500 mt-1">{message}</p>
      </div>
    </div>
  );
}
