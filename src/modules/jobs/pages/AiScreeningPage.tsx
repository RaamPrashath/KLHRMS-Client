'use client';

import { AlertCircle, ArrowLeft, Brain, CheckCircle2, Gauge, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRebuildRequisitionAiAnalysis,
  useRequisitionAiAnalysisQuery,
} from '@/modules/jobs/hooks/useJobRequisitionDetailQuery';

interface AiScreeningPageProps {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}

interface ScoreBandCandidate {
  aiScore: number | null;
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function scoreBands(candidates: ScoreBandCandidate[]) {
  return [
    { label: '80-100', count: candidates.filter((candidate) => (candidate.aiScore ?? -1) >= 80).length },
    { label: '70-79', count: candidates.filter((candidate) => (candidate.aiScore ?? -1) >= 70 && (candidate.aiScore ?? -1) < 80).length },
    { label: '50-69', count: candidates.filter((candidate) => (candidate.aiScore ?? -1) >= 50 && (candidate.aiScore ?? -1) < 70).length },
    { label: '<50', count: candidates.filter((candidate) => candidate.aiScore !== null && candidate.aiScore < 50).length },
  ];
}

function EmptyRulesState({ onRebuild, rebuilding }: { readonly onRebuild: () => void; readonly rebuilding: boolean }) {
  return (
    <div className="rounded-xl border border-warning-border bg-warning-bg p-5 text-warning-text shadow-[var(--shadow-1)]">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Rules are not built yet</h2>
          <p className="mt-1 text-sm">
            Build deterministic screening rules from the approved requisition fields before resume analysis begins.
          </p>
          <Button type="button" className="mt-4" onClick={onRebuild} disabled={rebuilding}>
            <RefreshCw className="size-4" />
            {rebuilding ? 'Building...' : 'Build Rules'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiScreeningPage({ orgSlug, memberId, requisitionId }: Readonly<AiScreeningPageProps>) {
  const router = useRouter();
  const analysisQuery = useRequisitionAiAnalysisQuery(orgSlug, memberId, requisitionId);
  const rebuildMutation = useRebuildRequisitionAiAnalysis(orgSlug, memberId, requisitionId);
  const analysis = analysisQuery.data;
  const rules = analysis?.rules ?? null;
  const candidates = analysis?.candidates ?? [];
  const minExperienceTarget = typeof rules?.sourceSnapshot.minExperience === 'number'
    ? rules.sourceSnapshot.minExperience
    : null;
  const recommendedCandidates = candidates.filter(
    (candidate) => (candidate.aiScore ?? 0) >= 70 && candidate.evaluationStatus === 'QUALIFIED',
  );
  const flaggedCandidates = candidates.filter((candidate) => candidate.isFlaggedForCheating);
  const bands = scoreBands(candidates);
  const maxBandCount = Math.max(...bands.map((band) => band.count), 1);

  async function handleRebuild() {
    try {
      await rebuildMutation.mutateAsync();
      toast.success('AI screening rules rebuilt');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to rebuild AI screening rules'));
    }
  }

  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Back to requisition"
              onClick={() => router.push(`/${orgSlug}/jobs/${requisitionId}`)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-primary" />
                <h1 className="truncate text-2xl font-semibold text-neutral-900">AI Screening</h1>
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Deterministic requisition rules for resume extraction and ATS scoring.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRebuild}
            disabled={rebuildMutation.isPending}
          >
            <RefreshCw className="size-4" />
            {rebuildMutation.isPending ? 'Rebuilding...' : 'Rebuild Rules'}
          </Button>
        </div>

        {analysisQuery.isLoading ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : null}

        {analysisQuery.isError ? (
          <div className="mt-6 rounded-xl border border-destructive-border bg-destructive-bg p-5 text-destructive-text">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">AI screening could not be loaded</h2>
                <p className="mt-1 text-sm">
                  {readActionError(analysisQuery.error, 'Try again in a moment.')}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => analysisQuery.refetch()}>
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        {analysis && !rules ? (
          <div className="mt-6">
            <EmptyRulesState onRebuild={handleRebuild} rebuilding={rebuildMutation.isPending} />
          </div>
        ) : null}

        {analysis && rules ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900">Compiled Rules</h2>
                    <p className="mt-1 text-sm text-neutral-500">Version {rules.rulesVersion}</p>
                  </div>
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                    Active
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-100 bg-canvas p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Experience</p>
                    <p className="mt-2 font-mono text-xl font-semibold text-neutral-900">
                      {minExperienceTarget ?? 0}y
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">target experience</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 bg-canvas p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Skills</p>
                    <p className="mt-2 font-mono text-xl font-semibold text-neutral-900">
                      {Object.keys(rules.scoringWeights.skillWeights).length}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">weighted anchors</p>
                  </div>
                  <div className="rounded-lg border border-neutral-100 bg-canvas p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Max Score</p>
                    <p className="mt-2 font-mono text-xl font-semibold text-neutral-900">
                      {rules.scoringWeights.totalPossiblePoints}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">raw points</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <h2 className="text-[17px] font-semibold text-neutral-900">Skill Weights</h2>
                <div className="mt-4 overflow-hidden rounded-lg border border-neutral-100">
                  {Object.entries(rules.scoringWeights.skillWeights).length ? (
                    Object.entries(rules.scoringWeights.skillWeights).map(([skill, points]) => (
                      <div
                        key={skill}
                        className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0"
                      >
                        <span className="text-sm font-medium text-neutral-900">{skill}</span>
                        <span className="font-mono text-[13px] text-neutral-700">{points} pts</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-neutral-500">No skill anchors configured.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <div className="flex items-center gap-2">
                  <Gauge className="size-5 text-primary" />
                  <h2 className="text-[17px] font-semibold text-neutral-900">Score Distribution</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {bands.map((band) => (
                    <div key={band.label} className="grid grid-cols-[64px_minmax(0,1fr)_32px] items-center gap-3">
                      <span className="font-mono text-xs text-neutral-500">{band.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-50">
                        <div
                          className="h-full rounded-lg bg-primary"
                          style={{ width: `${(band.count / maxBandCount) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-neutral-700">{band.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <h2 className="text-[17px] font-semibold text-neutral-900">Knockout Rule</h2>
                <div className="mt-4 flex items-start gap-3 rounded-lg bg-canvas p-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-success-text" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Explicit recruiter rule</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
                      {rules.knockoutRules.explicitRule ?? 'No knockout rule configured.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <h2 className="text-[17px] font-semibold text-neutral-900">Candidate Stats</h2>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Applications</span>
                    <span className="font-mono text-sm text-neutral-900">{analysis.stats.totalApplications}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Pending analysis</span>
                    <span className="font-mono text-sm text-neutral-900">{analysis.stats.pendingApplications}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Recommended</span>
                    <span className="font-mono text-sm text-neutral-900">{analysis.stats.recommendedCandidates}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Average AI score</span>
                    <span className="font-mono text-sm text-neutral-900">{analysis.stats.averageScore ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Flagged</span>
                    <span className="font-mono text-sm text-neutral-900">{analysis.stats.flaggedCandidates}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold text-neutral-900">
                  <Sparkles className="size-5 text-success-text" />
                  Recommended Candidates
                </h2>
                <div className="mt-4 space-y-2">
                  {recommendedCandidates.slice(0, 6).map((candidate) => (
                    <div key={candidate.applicationId} className="rounded-lg border border-neutral-100 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-neutral-900">{candidate.candidateName}</p>
                        <span className="font-mono text-xs text-primary">{candidate.aiScore}</span>
                      </div>
                      <p className="truncate text-xs text-neutral-500">{candidate.email}</p>
                    </div>
                  ))}
                  {recommendedCandidates.length === 0 ? (
                    <p className="text-sm text-neutral-500">No candidates are above the 70+ frontend recommendation threshold yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-warning-border bg-warning-bg p-5 text-warning-text shadow-[var(--shadow-1)]">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">Flagged Candidates</h2>
                    <div className="mt-3 space-y-2">
                      {flaggedCandidates.slice(0, 6).map((candidate) => (
                        <div key={candidate.applicationId} className="rounded-lg border border-warning-border bg-surface px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-neutral-900">{candidate.candidateName}</p>
                            <span className="font-mono text-xs text-warning-text">{candidate.aiScore ?? '—'}</span>
                          </div>
                          <p className="truncate text-xs text-neutral-500">{candidate.email}</p>
                        </div>
                      ))}
                      {flaggedCandidates.length === 0 ? (
                        <p className="text-sm">No suspicious hidden text flags found.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Last compiled</p>
                <p className="mt-2 text-sm text-neutral-900">{formatDateTime(rules.updatedAt)}</p>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
