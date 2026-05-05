export function BulkAttendanceLegend() {
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-primary/20 border border-primary/40" />
        <span className="text-xs text-neutral-500">Work log</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-5 bg-success-text rounded-full" />
        <span className="text-xs text-neutral-500">Clock in</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-5 bg-destructive-text rounded-full" />
        <span className="text-xs text-neutral-500">Clock out</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-primary-subtle border border-primary/30 opacity-60" />
        <span className="text-xs text-neutral-500">Saving…</span>
      </div>
    </div>
  );
}
