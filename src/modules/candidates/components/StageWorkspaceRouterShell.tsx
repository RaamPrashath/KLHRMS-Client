'use client';

import { Loader2, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StageWorkspacePageShell } from '@/modules/candidates/components/StageWorkspacePageShell';
import { usePipelineBoardByJobSlug, useStageWorkspaceByJobSlug } from '@/modules/candidates/hooks/useAtsPipeline';
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
  const boardQuery = usePipelineBoardByJobSlug(orgSlug, memberId, jobSlug);
  const routeStage = boardQuery.data?.stages.find((stage) => stage.slug === stageSlug) ?? null;
  const stageType = routeStage?.stageType?.toUpperCase() ?? null;

  const shouldLoadOfferWorkspace = stageType === 'OFFER';
  const shouldLoadAcceptedOnboardingWorkspace = stageType === 'HIRED';
  const shouldLoadOnboardWorkspace = stageType === 'ONBOARDING';
  const shouldLoadInterviewWorkspace = stageType === 'INTERVIEW';

  const stageWorkspaceQuery = useStageWorkspaceByJobSlug(
    orgSlug,
    memberId,
    shouldLoadInterviewWorkspace ? jobSlug : null,
    shouldLoadInterviewWorkspace ? stageSlug : null,
  );
  const workspace = stageWorkspaceQuery.data;

  const offerWorkspaceQuery = useOfferWorkspace(
    orgSlug,
    memberId,
    shouldLoadOfferWorkspace ? jobSlug : null,
    shouldLoadOfferWorkspace ? stageSlug : null,
  );
  const offerErrorStatus = readErrorStatus(offerWorkspaceQuery.error);

  const acceptedOnboardingQuery = useAcceptedOnboardingWorkspace(
    orgSlug,
    memberId,
    shouldLoadAcceptedOnboardingWorkspace ? jobSlug : null,
    shouldLoadAcceptedOnboardingWorkspace ? stageSlug : null,
  );
  const acceptedOnboardingErrorStatus = readErrorStatus(acceptedOnboardingQuery.error);

  const onboardQuery = useOnboardWorkspace(
    orgSlug,
    memberId,
    shouldLoadOnboardWorkspace ? jobSlug : null,
    shouldLoadOnboardWorkspace ? stageSlug : null,
  );
  const onboardErrorStatus = readErrorStatus(onboardQuery.error);

  const renderRegularWorkspace = () => (
    <StageWorkspacePageShell
      orgSlug={orgSlug}
      memberId={memberId}
      jobSlug={jobSlug}
      stageSlug={stageSlug}
      initialWorkspace={workspace}
    />
  );

  const renderLoading = (label = 'Loading stage workspace') => (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
      <div className="inline-flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <Loader2 className="size-4 animate-spin text-primary" />
        {label}
      </div>
    </div>
  );

  const renderError = (error: Error | null, retry: () => void) => (
    <div className="min-h-full bg-canvas p-6">
      <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
        <p className="font-medium text-neutral-900">{readErrorMessage(error)}</p>
        <p className="mt-1 text-neutral-500">Refresh the workspace or return to the candidate pipeline.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={retry}>
          <RotateCcw className="size-3.5" />
          Retry
        </Button>
      </div>
    </div>
  );

  if (boardQuery.isLoading) {
    return renderLoading();
  }

  if (boardQuery.isError) {
    return renderError(boardQuery.error, () => {
      void boardQuery.refetch();
    });
  }

  if (!routeStage) {
    return renderError(new Error('Pipeline stage was not found.'), () => {
      void boardQuery.refetch();
    });
  }

  if (shouldLoadOfferWorkspace) {
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
    if (offerWorkspaceQuery.isError) {
      if (offerErrorStatus === 409) return renderRegularWorkspace();
      return renderError(offerWorkspaceQuery.error, () => {
        void offerWorkspaceQuery.refetch();
      });
    }
    return renderLoading('Loading offer workspace');
  }

  if (shouldLoadAcceptedOnboardingWorkspace) {
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
    if (acceptedOnboardingQuery.isError) {
      if (acceptedOnboardingErrorStatus === 409) return renderRegularWorkspace();
      return renderError(acceptedOnboardingQuery.error, () => {
        void acceptedOnboardingQuery.refetch();
      });
    }
    return renderLoading('Loading onboarding workspace');
  }

  if (shouldLoadOnboardWorkspace) {
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
    if (onboardQuery.isError) {
      if (onboardErrorStatus === 409) return renderRegularWorkspace();
      return renderError(onboardQuery.error, () => {
        void onboardQuery.refetch();
      });
    }
    return renderLoading('Loading onboard workspace');
  }

  if (shouldLoadInterviewWorkspace) {
    if (stageWorkspaceQuery.isLoading) {
      return renderLoading();
    }

    if (stageWorkspaceQuery.isError || !workspace) {
      return renderError(stageWorkspaceQuery.error, () => {
        void stageWorkspaceQuery.refetch();
      });
    }

    return renderRegularWorkspace();
  }

  return renderError(new Error('This stage does not have a dedicated workspace.'), () => {
    void boardQuery.refetch();
  });
}
