'use client';

import { Loader2, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StageWorkspacePageShell } from '@/modules/candidates/components/StageWorkspacePageShell';
import { OfferStagePageShell } from '@/modules/offers/components/OfferStagePageShell';
import { useOfferWorkspace } from '@/modules/offers/hooks/useOfferWorkspace';

interface StageWorkspaceRouterShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
}

function readErrorStatus(error: Error | null): number | null {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as { status?: unknown };
    return typeof parsed.status === 'number' ? parsed.status : null;
  } catch {
    return null;
  }
}

function readErrorMessage(error: Error | null): string {
  if (!error) return 'Stage workspace could not be loaded.';
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : 'Stage workspace could not be loaded.';
  } catch {
    return error.message || 'Stage workspace could not be loaded.';
  }
}

export function StageWorkspaceRouterShell({
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
}: StageWorkspaceRouterShellProps) {
  const offerWorkspaceQuery = useOfferWorkspace(orgSlug, memberId, jobSlug, stageSlug);
  const errorStatus = readErrorStatus(offerWorkspaceQuery.error);

  if (offerWorkspaceQuery.data) {
    return (
      <OfferStagePageShell
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
        initialWorkspace={offerWorkspaceQuery.data}
      />
    );
  }

  if (offerWorkspaceQuery.isError && errorStatus === 409) {
    return (
      <StageWorkspacePageShell
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
      />
    );
  }

  if (offerWorkspaceQuery.isError) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
          <p className="font-medium text-neutral-900">{readErrorMessage(offerWorkspaceQuery.error)}</p>
          <p className="mt-1 text-neutral-500">Refresh the workspace or return to the candidate pipeline.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void offerWorkspaceQuery.refetch()}
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
      <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-[var(--shadow-1)]">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading stage workspace
      </div>
    </div>
  );
}
