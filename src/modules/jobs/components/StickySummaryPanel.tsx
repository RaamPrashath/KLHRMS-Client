'use client';

import { CheckCircle2, Circle, Save } from 'lucide-react';

interface StickySummaryPanelProps {
  status: string;
  createdByName: string;
  completionCount: number;
  totalSections: number;
  isSaving: boolean;
  lastSaved: Date | null;
}

const SECTION_LABELS = [
  'Basic information',
  'Hiring context',
  'Compensation',
  'Requirements',
  'Posting content',
  'Approval preview',
];

export function StickySummaryPanel({
  status,
  createdByName,
  completionCount,
  totalSections,
  isSaving,
  lastSaved,
}: Readonly<StickySummaryPanelProps>) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-28 space-y-4">
        <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Status</span>
            <span className="rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-xs font-medium text-info-text">
              {status}
            </span>
          </div>
          <div className="text-sm text-neutral-700">
            <span className="text-neutral-500">Created by</span>
            <p className="font-medium text-neutral-900">{createdByName}</p>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Publishing readiness
          </h3>
          <div className="space-y-2">
            {SECTION_LABELS.map((label, index) => {
              const done = index < completionCount;
              return (
                <div key={label} className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success-text" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-neutral-300" />
                  )}
                  <span className={done ? 'text-sm text-neutral-900' : 'text-sm text-neutral-400'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            {completionCount}/{totalSections} sections complete
          </div>
        </div>

        <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Save className="size-3.5" />
            {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Not saved yet'}
          </div>
        </div>
      </div>
    </aside>
  );
}
