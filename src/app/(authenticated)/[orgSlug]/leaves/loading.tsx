export default function LeavesLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-600" />
        <p className="text-sm text-neutral-500">Loading leaves...</p>
      </div>
    </div>
  );
}
