export function BulkAttendanceLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legend</span>
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-sm border border-primary bg-primary/10"
        />
        <span className="text-xs text-muted-foreground">Work log</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="size-1.5 rounded-full bg-primary"
        />
        <span className="text-xs text-muted-foreground">Current time</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="size-1.5 rounded-full bg-warning animate-pulse"
        />
        <span className="text-xs text-muted-foreground">Saving</span>
      </div>
    </div>
  );
}
