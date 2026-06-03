'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronLeft, Loader2, RotateCcw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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

type OfferStatusFilter = 'ALL' | 'UNSENT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'EXPIRED';

const COMPENSATION_TOKENS = ['job.salaryMin', 'job.salaryMax', 'job.currency'];

const STATUS_FILTER_OPTIONS: { value: OfferStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNSENT', label: 'Unsent' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXPIRED', label: 'Expired' },
];

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

function candidateErrors(candidate: OfferWorkspaceCandidate, requiresCompensation: boolean, jobHasSalaryData: boolean): string[] {
  const errors = candidate.eligibility.errors.map(normalizeErrorLabel);
  if (requiresCompensation && !jobHasSalaryData) {
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
  const [, startTransition] = useTransition();
  const router = useRouter();
  const workspaceQuery = useOfferWorkspace(orgSlug, memberId, jobSlug, stageSlug, initialWorkspace);
  const workspace = workspaceQuery.data;

  // ── Filter & pagination state ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Selection & send state ──
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

  // ── Filtered candidates ──
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

  // ── Client-side pagination ──
  const totalFiltered = filteredCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedCandidates = useMemo(
    () => filteredCandidates.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredCandidates, safePage, pageSize],
  );

  const visibleSelectableIds = useMemo(
    () =>
      paginatedCandidates
        .filter((candidate) => candidateErrors(candidate, requiresCompensation, workspace?.jobHasSalaryData ?? true).length === 0)
        .map((candidate) => candidate.applicationId),
    [paginatedCandidates, requiresCompensation, workspace?.jobHasSalaryData],
  );

  // ── Handlers ──
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    startTransition(() => {
      setStatusFilter(value as OfferStatusFilter);
      setPage(1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    startTransition(() => {
      setSearch('');
      setStatusFilter('ALL');
      setPage(1);
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => setPage(newPage));
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    startTransition(() => {
      setPageSize(newSize);
      setPage(1);
    });
  }, []);

  // Clean up stale selections
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedApplicationIds((current) => {
        const next = new Set<string>();
        for (const applicationId of current) {
          const candidate = candidateById.get(applicationId);
          if (candidate && candidateErrors(candidate, requiresCompensation, workspace?.jobHasSalaryData ?? true).length === 0) {
            next.add(applicationId);
          }
        }
        return next.size === current.size ? current : next;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [candidateById, requiresCompensation, workspace?.jobHasSalaryData]);

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

  // ── Loading state ──
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
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      {/* ── Page header ── */}
      <div className="ml-7 mt-7 flex items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-1 shrink-0 text-neutral-500 hover:text-neutral-900"
          onClick={handleBackToPipeline}
          aria-label="Back to candidate pipeline"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">{workspace.stage.name}</h1>
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
        <div className="flex shrink-0 items-center gap-2">
          {selectedApplicationIds.size > 0 ? (
            <span className="rounded-lg bg-primary-ghost px-3 py-1 text-xs font-medium text-primary">
              {selectedApplicationIds.size} selected
            </span>
          ) : null}
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

      {/* ── Candidate table (includes filters + pagination) ── */}
      <OfferCandidateTable
        candidates={paginatedCandidates}
        totalFiltered={totalFiltered}
        selectedApplicationIds={selectedApplicationIds}
        acceptedStage={workspace.acceptedStage}
        rejectedStage={workspace.rejectedStage}
        visibleSelectableIds={visibleSelectableIds}
        movingApplicationId={movingApplicationId}
        search={search}
        statusFilter={statusFilter}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        requiresCompensation={requiresCompensation}
        jobHasSalaryData={workspace.jobHasSalaryData ?? true}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        onClearAll={handleClearAll}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onToggleCandidate={toggleCandidate}
        onToggleAllVisible={toggleAllVisible}
        onMoveToStage={(applicationId, stage) => void moveToStage(applicationId, stage)}
      />

      {/* ── Send offer dialog ── */}
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
