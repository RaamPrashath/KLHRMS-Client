export function BulkAttendanceLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Legend</span>
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-sm border-l-2"
          style={{
            backgroundColor: 'var(--color-info-bg)',
            borderLeftColor: 'var(--color-info-text)',
          }}
        />
        <span className="text-xs text-neutral-500">Work log</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="size-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <span className="text-xs text-neutral-500">Current time</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="size-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--color-warning-text)' }}
        />
        <span className="text-xs text-neutral-500">Saving</span>
      </div>
    </div>
  );
}
