'use client';

import { Loader2, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StageWorkspacePageShell } from '@/modules/candidates/components/StageWorkspacePageShell';
import { OfferStagePageShell } from '@/modules/offers/components/OfferStagePageShell';
import { AcceptedOnboardingShell } from '@/modules/onboarding/components/AcceptedOnboardingShell';
import { OnboardStageShell } from '@/modules/onboarding/components/OnboardStageShell';
import { useOfferWorkspace } from '@/modules/offers/hooks/useOfferWorkspace';
import { useAcceptedOnboardingWorkspace, useOnboardWorkspace } from '@/modules/onboarding/hooks/useOnboarding';

interface StageWorkspaceRouterShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly organizationId: string;
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
  organizationId,
  jobSlug,
  stageSlug,
}: StageWorkspaceRouterShellProps) {
  // Try offer workspace first (for OFFER stages)
  const offerWorkspaceQuery = useOfferWorkspace(orgSlug, memberId, jobSlug, stageSlug);
  const errorStatus = readErrorStatus(offerWorkspaceQuery.error);

  // For HIRED/accepted stages, try the accepted onboarding workspace
  const acceptedOnboardingQuery = useAcceptedOnboardingWorkspace(
    orgSlug, memberId, jobSlug, stageSlug,
  );
  const acceptedOnboardingErrorStatus = readErrorStatus(acceptedOnboardingQuery.error);

  // For ONBOARDING stages, try the onboard workspace
  const onboardQuery = useOnboardWorkspace(
    orgSlug, memberId, jobSlug, stageSlug,
  );
  const onboardErrorStatus = readErrorStatus(onboardQuery.error);

  // Offer workspace loaded → show offer shell
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

  // HIRED stage → show accepted onboarding shell
  if (acceptedOnboardingQuery.data) {
    return (
      <AcceptedOnboardingShell
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
        initialWorkspace={acceptedOnboardingQuery.data}
      />
    );
  }

  // ONBOARDING stage → show onboard shell
  if (onboardQuery.data) {
    return (
      <OnboardStageShell
        orgSlug={orgSlug}
        memberId={memberId}
        organizationId={organizationId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
        initialWorkspace={onboardQuery.data}
      />
    );
  }

  // Offer workspace returned 409 (not offer stage) → fallback to regular
  if (offerWorkspaceQuery.isError && errorStatus === 409
    && !acceptedOnboardingQuery.isLoading && !onboardQuery.isLoading) {
    return (
      <StageWorkspacePageShell
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
      />
    );
  }

  if (offerWorkspaceQuery.isError && errorStatus !== 409
    && acceptedOnboardingQuery.isError && acceptedOnboardingErrorStatus !== 409
    && onboardQuery.isError && onboardErrorStatus !== 409) {
    const error = offerWorkspaceQuery.error ?? acceptedOnboardingQuery.error ?? onboardQuery.error;
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
          <p className="font-medium text-neutral-900">{readErrorMessage(error)}</p>
          <p className="mt-1 text-neutral-500">Refresh the workspace or return to the candidate pipeline.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void offerWorkspaceQuery.refetch();
              void acceptedOnboardingQuery.refetch();
              void onboardQuery.refetch();
            }}
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
