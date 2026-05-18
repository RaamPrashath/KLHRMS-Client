'use client';

import { Import, Layers, Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PipelineSetupCardProps {
  creatingDefault: boolean;
  importing: boolean;
  onAddStage: () => void;
  onUseDefault: () => void;
  onImport: () => void;
}

export function PipelineSetupCard({
  creatingDefault,
  importing,
  onAddStage,
  onUseDefault,
  onImport,
}: Readonly<PipelineSetupCardProps>) {
  const busy = creatingDefault || importing;

  return (
    <aside className="relative w-full max-w-[320px] rounded-xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
      {importing ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Loader2 className="size-4 animate-spin text-primary" />
            Importing stages...
          </div>
        </div>
      ) : null}

      <h2 className="text-[17px] font-semibold text-neutral-900">Pipeline Setup</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Your pipeline only has the Applied stage. Add more stages to start tracking candidates.
      </p>

      <div className="mt-6 space-y-3">
        <Button type="button" className="w-full justify-start" disabled={busy} onClick={onAddStage}>
          <Plus className="size-4" />
          Add first stage
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start border-primary text-primary hover:bg-primary-ghost"
          disabled={busy}
          onClick={onUseDefault}
        >
          {creatingDefault ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
          Use default pipeline
        </Button>
        <Button type="button" variant="ghost" className="w-full justify-start" disabled={busy} onClick={onImport}>
          <Import className="size-4" />
          Import from existing job
        </Button>
      </div>
    </aside>
  );
}
