'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RotateCcw, Search, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OfferCandidateTable } from '@/modules/offers/components/OfferCandidateTable';
import { SendOfferDialog } from '@/modules/offers/components/SendOfferDialog';
import { useOfferTemplate } from '@/modules/offers/hooks/useOfferTemplates';
import { useOfferWorkspace } from '@/modules/offers/hooks/useOfferWorkspace';
import { useMoveApplicationStage } from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  OfferStageSummary,
  OfferStageWorkspace,
  OfferTemplate,
  OfferWorkspaceCandidate,
} from '@/modules/offers/types/offerTypes';

interface OfferStagePageShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
  readonly initialWorkspace?: OfferStageWorkspace;
}

interface FilterOption {
  key: OfferStatusFilter;
  label: string;
}

interface CandidateErrorContext {
  requiresCompensation: boolean;
  jobHasSalaryData: boolean;
}

type OfferStatusFilter = 'ALL' | 'UNSENT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'EXPIRED';

const FILTERS: FilterOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNSENT', label: 'Unsent' },
  { key: 'SENT', label: 'Sent' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'EXPIRED', label: 'Expired' },
];

const COMPENSATION_TOKENS = ['job.salaryMin', 'job.salaryMax', 'job.currency'];

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function candidateName(candidate: OfferWorkspaceCandidate): string {
  return `${candidate.candidate.firstName ?? ''} ${candidate.candidate.lastName ?? ''}`.trim() || 'Unnamed candidate';
}

function templateRequiresCompensation(template: OfferTemplate | null, categoryId: string | null): boolean {
  if (!template || !categoryId) return false;
  const htmlValues = [
    template.footerHtml ?? '',
    ...template.sections
      .filter((section) => section.categoryId === categoryId)
      .map((section) => section.html ?? ''),
  ];
  return htmlValues.some((value) => COMPENSATION_TOKENS.some((token) => value.includes(token)));
}

function normalizeErrorLabel(error: string): string {
  if (error.toLowerCase().includes('email')) return 'Missing email';
  if (error.toLowerCase().includes('first name')) return 'Missing first name';
  if (error.toLowerCase().includes('last name')) return 'Missing last name';
  if (error.toLowerCase().includes('salary') || error.toLowerCase().includes('compensation')) {
    return 'Missing compensation data';
  }
  return error;
}

function candidateErrors(candidate: OfferWorkspaceCandidate, context: CandidateErrorContext): string[] {
  const errors = candidate.eligibility.errors.map(normalizeErrorLabel);
  if (context.requiresCompensation && !context.jobHasSalaryData) {
    errors.push('Missing compensation data');
  }
  return Array.from(new Set(errors));
}

function matchesSearch(candidate: OfferWorkspaceCandidate, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    candidateName(candidate),
    candidate.candidate.email,
    candidate.offerStatus,
    candidate.source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

function matchesStatus(candidate: OfferWorkspaceCandidate, status: OfferStatusFilter): boolean {
  return status === 'ALL' || candidate.offerStatus === status;
}

export function OfferStagePageShell({
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
  initialWorkspace,
}: OfferStagePageShellProps) {
  const router = useRouter();
  const workspaceQuery = useOfferWorkspace(orgSlug, memberId, jobSlug, stageSlug, initialWorkspace);
  const workspace = workspaceQuery.data;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>('ALL');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(workspace?.recentTemplate?.id ?? workspace?.templates[0]?.id ?? null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState(10);
  const [movingApplicationId, setMovingApplicationId] = useState<string | null>(null);

  const selectedTemplateQuery = useOfferTemplate(orgSlug, memberId, selectedTemplateId);
  const selectedTemplate = selectedTemplateQuery.data ?? null;
  const requiresCompensation = templateRequiresCompensation(selectedTemplate, selectedCategoryId);
  const moveApplication = useMoveApplicationStage(orgSlug, memberId, workspace?.jobPosting.id ?? null);

  const errorContext = useMemo<CandidateErrorContext>(
    () => ({
      requiresCompensation,
      jobHasSalaryData: workspace?.jobHasSalaryData ?? true,
    }),
    [requiresCompensation, workspace?.jobHasSalaryData],
  );

  const filteredCandidates = useMemo(
    () =>
      (workspace?.candidates ?? []).filter((candidate) =>
        matchesSearch(candidate, search) && matchesStatus(candidate, statusFilter),
      ),
    [search, statusFilter, workspace?.candidates],
  );

  const candidateById = useMemo(() => {
    const map = new Map<string, OfferWorkspaceCandidate>();
    for (const candidate of workspace?.candidates ?? []) {
      map.set(candidate.applicationId, candidate);
    }
    return map;
  }, [workspace?.candidates]);

  const visibleSelectableIds = useMemo(
    () =>
      filteredCandidates
        .filter((candidate) => candidateErrors(candidate, errorContext).length === 0)
        .map((candidate) => candidate.applicationId),
    [errorContext, filteredCandidates],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedApplicationIds((current) => {
        const next = new Set<string>();
        for (const applicationId of current) {
          const candidate = candidateById.get(applicationId);
          if (candidate && candidateErrors(candidate, errorContext).length === 0) {
            next.add(applicationId);
          }
        }
        return next.size === current.size ? current : next;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [candidateById, errorContext]);

  const selectedCandidates = useMemo(
    () =>
      Array.from(selectedApplicationIds)
        .map((applicationId) => candidateById.get(applicationId))
        .filter((candidate): candidate is OfferWorkspaceCandidate => Boolean(candidate)),
    [candidateById, selectedApplicationIds],
  );

  function handleBackToPipeline() {
    const keys = [
      `ats-stage-return:${orgSlug}:${jobSlug}:${stageSlug}`,
      workspace ? `ats-stage-return:${orgSlug}:${jobSlug}:${workspace.stage.slug}` : null,
    ].filter((key): key is string => Boolean(key));
    const stored = keys.map((key) => window.sessionStorage.getItem(key)).find(Boolean);
    router.push(stored ?? `/${orgSlug}/candidates/${jobSlug}`);
  }

  function toggleCandidate(applicationId: string, checked: boolean) {
    setSelectedApplicationIds((current) => {
      const next = new Set(current);
      if (checked) next.add(applicationId);
      else next.delete(applicationId);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedApplicationIds((current) => {
      const next = new Set(current);
      if (checked) {
        for (const applicationId of visibleSelectableIds) next.add(applicationId);
      } else {
        for (const applicationId of visibleSelectableIds) next.delete(applicationId);
      }
      return next;
    });
  }

  async function moveToStage(applicationId: string, stage: OfferStageSummary) {
    try {
      setMovingApplicationId(applicationId);
      await moveApplication.mutateAsync({ applicationId, toStageId: stage.id });
      setSelectedApplicationIds((current) => {
        const next = new Set(current);
        next.delete(applicationId);
        return next;
      });
      await workspaceQuery.refetch();
      toast.success(`Candidate moved to ${stage.name}`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to move candidate'));
    } finally {
      setMovingApplicationId(null);
    }
  }

  if (workspaceQuery.isLoading && !workspace) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-[var(--shadow-1)]">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading offer workspace
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
          <p className="font-medium text-neutral-900">Offer workspace was not found.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void workspaceQuery.refetch()}>
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas px-4 py-5 sm:px-8">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1 text-neutral-500 hover:text-neutral-900"
            onClick={handleBackToPipeline}
            aria-label="Back to candidate pipeline"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-neutral-900 sm:text-3xl">{workspace.stage.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-500">{workspace.jobPosting.title}</span>
              <span className="size-1 rounded-full bg-neutral-300" />
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-neutral-400">
                {workspace.candidateCount} candidates
              </span>
              {workspace.latestBatch?.failureCount ? (
                <>
                  <span className="size-1 rounded-full bg-neutral-300" />
                  <span className="rounded-full bg-destructive-bg px-2 py-0.5 text-xs font-medium text-destructive-text">
                    {workspace.latestBatch.failureCount} failed
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedApplicationIds.size > 0 ? (
            <span className="rounded-full bg-primary-ghost px-3 py-1 text-xs font-medium text-primary">
              {selectedApplicationIds.size} selected
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void workspaceQuery.refetch()}
            disabled={workspaceQuery.isFetching}
          >
            {workspaceQuery.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary-hover"
            disabled={selectedApplicationIds.size === 0}
            onClick={() => setSendDialogOpen(true)}
          >
            <Send className="size-3.5" />
            Send offer letter
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search offer candidates"
            placeholder="Search candidates"
            className="bg-neutral-50 pl-9"
          />
        </div>
        <div className="flex overflow-x-auto rounded-xl border border-neutral-100 bg-neutral-50 p-1">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  'h-8 shrink-0 rounded-lg px-3 text-[13px] font-medium transition-colors',
                  active ? 'bg-surface text-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {(!workspace.acceptedStage || !workspace.rejectedStage) ? (
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-neutral-500">
          {!workspace.acceptedStage ? <span>No Accepted stage configured</span> : null}
          {!workspace.rejectedStage ? <span>No Rejected stage configured</span> : null}
        </div>
      ) : null}

      <OfferCandidateTable
        candidates={filteredCandidates}
        selectedApplicationIds={selectedApplicationIds}
        acceptedStage={workspace.acceptedStage}
        rejectedStage={workspace.rejectedStage}
        visibleSelectableIds={visibleSelectableIds}
        movingApplicationId={movingApplicationId}
        getCandidateErrors={(candidate) => candidateErrors(candidate, errorContext)}
        onToggleCandidate={toggleCandidate}
        onToggleAllVisible={toggleAllVisible}
        onMoveToStage={(applicationId, stage) => void moveToStage(applicationId, stage)}
      />

      <SendOfferDialog
        open={sendDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        stageSlug={stageSlug}
        workspace={workspace}
        selectedCandidates={selectedCandidates}
        selectedTemplateId={selectedTemplateId}
        selectedCategoryId={selectedCategoryId}
        expiryDays={expiryDays}
        onOpenChange={setSendDialogOpen}
        onSelectedTemplateChange={setSelectedTemplateId}
        onSelectedCategoryChange={setSelectedCategoryId}
        onExpiryDaysChange={setExpiryDays}
        onDispatched={() => {
          setSelectedApplicationIds(new Set());
          void workspaceQuery.refetch();
        }}
      />
    </div>
  );
}
