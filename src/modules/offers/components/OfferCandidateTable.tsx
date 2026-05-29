'use client';

import { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  ExternalLink,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ResumePreviewAction } from '@/modules/offers/components/ResumePreviewAction';
import type {
  OfferStageSummary,
  OfferWorkspaceCandidate,
} from '@/modules/offers/types/offerTypes';

// ─── Constants ─────────────────────────────────────────────────────────────────

type OfferStatusFilter = 'ALL' | 'UNSENT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'EXPIRED';

const STATUS_FILTER_OPTIONS: { value: OfferStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNSENT', label: 'Unsent' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXPIRED', label: 'Expired' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface OfferCandidateTableProps {
  readonly candidates: OfferWorkspaceCandidate[];
  readonly totalFiltered: number;
  readonly selectedApplicationIds: ReadonlySet<string>;
  readonly acceptedStage: OfferStageSummary | null;
  readonly rejectedStage: OfferStageSummary | null;
  readonly visibleSelectableIds: string[];
  readonly movingApplicationId: string | null;
  readonly search: string;
  readonly statusFilter: OfferStatusFilter;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly requiresCompensation: boolean;
  readonly jobHasSalaryData: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onStatusFilterChange: (value: string) => void;
  readonly onClearAll: () => void;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;
  readonly onToggleCandidate: (applicationId: string, checked: boolean) => void;
  readonly onToggleAllVisible: (checked: boolean) => void;
  readonly onMoveToStage: (applicationId: string, stage: OfferStageSummary) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function candidateName(candidate: OfferWorkspaceCandidate): string {
  return `${candidate.candidate.firstName ?? ''} ${candidate.candidate.lastName ?? ''}`.trim() || 'Unnamed candidate';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function statusClasses(status: string): string {
  if (status === 'ACCEPTED') return 'bg-success-bg text-success-text';
  if (status === 'REJECTED' || status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'EXPIRED' || status === 'WITHDRAWN') return 'bg-warning-bg text-warning-text';
  if (status === 'SENT') return 'bg-info-bg text-info-text';
  if (status === 'DRAFT') return 'bg-warning-bg text-warning-text';
  return 'bg-neutral-50 text-neutral-500';
}

function statusLabel(status: string): string {
  if (status === 'UNSENT') return 'Unsent';
  if (status === 'DRAFT') return 'Saving PDF';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function renderStatusBadge(
  status: string,
  acceptedStage: OfferStageSummary | null,
  rejectedStage: OfferStageSummary | null,
) {
  if (status === 'ACCEPTED' && acceptedStage) return null;
  if (status === 'REJECTED' && rejectedStage) return null;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(status))}>
      {status === 'DRAFT' && <Loader2 className="size-3 animate-spin" />}
      {statusLabel(status)}
    </span>
  );
}

function colWidth(columnId: string): string {
  const map: Record<string, string> = {
    checkbox: 'w-[40px]',
    candidate: 'w-[26%]',
    status: 'w-[12%]',
    lastSent: 'w-[12%]',
    expires: 'w-[12%]',
    resume: 'w-[12%]',
    latestPdf: 'w-[12%]',
    actions: 'w-[12%]',
  };
  return map[columnId] ?? 'w-[12%]';
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

// ─── Column definitions ────────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  label: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'checkbox', label: '' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'status', label: 'Offer status' },
  { id: 'lastSent', label: 'Last sent' },
  { id: 'expires', label: 'Expires' },
  { id: 'resume', label: 'Resume' },
  { id: 'latestPdf', label: 'Latest PDF' },
  { id: 'actions', label: 'Actions' },
];

// ─── Pagination sub-component ──────────────────────────────────────────────────

function OfferPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-500">Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[13px] text-neutral-500">per page</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="inline-flex size-8 items-center justify-center text-[13px] text-neutral-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`inline-flex size-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-white'
                  : 'border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50'
              }`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function OfferCandidateTable({
  candidates,
  totalFiltered,
  selectedApplicationIds,
  acceptedStage,
  rejectedStage,
  visibleSelectableIds,
  movingApplicationId,
  search,
  statusFilter,
  page,
  pageSize,
  totalPages,
  onSearchChange,
  onStatusFilterChange,
  onClearAll,
  onPageChange,
  onPageSizeChange,
  onToggleCandidate,
  onToggleAllVisible,
  onMoveToStage,
}: OfferCandidateTableProps) {
  const selectedVisibleCount = visibleSelectableIds.filter((id) => selectedApplicationIds.has(id)).length;
  const allVisibleSelected = visibleSelectableIds.length > 0 && selectedVisibleCount === visibleSelectableIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const hasActiveFilters = search || statusFilter !== 'ALL';

  const headerCheckbox = useMemo(
    () => (
      <Checkbox
        aria-label="Select all visible valid candidates"
        checked={someVisibleSelected ? 'indeterminate' : allVisibleSelected}
        disabled={visibleSelectableIds.length === 0}
        onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
      />
    ),
    [allVisibleSelected, someVisibleSelected, visibleSelectableIds.length, onToggleAllVisible],
  );

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* ── Layer 1: Filters ── */}
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <Input
                placeholder="Search candidates"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={statusFilter}
                onValueChange={onStatusFilterChange}
              >
                <SelectTrigger className="h-9 w-40 text-sm border-0 bg-canvas">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Layer 2: Header row ── */}
        <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={cn(colWidth(col.id), 'shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider', col.id === 'checkbox' ? '' : 'text-left')}
            >
              {col.id === 'checkbox' ? headerCheckbox : col.label}
            </div>
          ))}
        </div>

        {/* ── Layer 3: Body ── */}
        <div className="px-4">
          {candidates.length > 0 ? (
            <div className="flex flex-col divide-y divide-black/4 bg-surface">
              {candidates.map((candidate) => {
                const name = candidateName(candidate);
                const moving = movingApplicationId === candidate.applicationId;
                const alreadyResponded =
                  candidate.offerStatus === 'ACCEPTED' || candidate.offerStatus === 'REJECTED';
                const checked = selectedApplicationIds.has(candidate.applicationId);

                return (
                  <div
                    key={candidate.applicationId}
                    className={cn(
                      'flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4',
                      checked && 'bg-primary-ghost',
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(colWidth('checkbox'), 'shrink-0 flex items-center')}>
                      <Checkbox
                        aria-label={`Select ${name}`}
                        checked={checked}
                        disabled={visibleSelectableIds.indexOf(candidate.applicationId) === -1}
                        onCheckedChange={(value) => onToggleCandidate(candidate.applicationId, value === true)}
                      />
                    </div>

                    {/* Candidate */}
                    <div className={cn(colWidth('candidate'), 'shrink-0 min-w-0')}>
                      <p className="truncate text-sm font-medium text-neutral-900" title={name}>
                        {name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500" title={candidate.candidate.email ?? undefined}>
                        {candidate.candidate.email || 'No email'}
                      </p>
                    </div>

                    {/* Offer status */}
                    <div className={cn(colWidth('status'), 'shrink-0')}>
                      {renderStatusBadge(candidate.offerStatus, acceptedStage, rejectedStage)}
                      {candidate.latestOffer?.emailError ? (
                        <p className="mt-1 line-clamp-2 text-xs text-destructive-text leading-tight">
                          {candidate.latestOffer.emailError}
                        </p>
                      ) : null}
                    </div>

                    {/* Last sent */}
                    <div className={cn(colWidth('lastSent'), 'shrink-0 font-mono text-xs text-neutral-500')}>
                      {formatDate(candidate.latestOffer?.sentAt ?? candidate.latestOffer?.emailSentAt)}
                    </div>

                    {/* Expires */}
                    <div className={cn(colWidth('expires'), 'shrink-0 font-mono text-xs text-neutral-500')}>
                      {formatDate(candidate.latestOffer?.expiresAt)}
                    </div>

                    {/* Resume */}
                    <div className={cn(colWidth('resume'), 'shrink-0')}>
                      <ResumePreviewAction resumeUrl={candidate.candidate.resumeUrl} candidateName={name} />
                    </div>

                    {/* Latest PDF */}
                    <div className={cn(colWidth('latestPdf'), 'shrink-0')}>
                      {candidate.latestOffer?.pdfUrl ? (
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-neutral-700">
                          <a
                            href={candidate.latestOffer.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`View latest offer PDF for ${name}`}
                          >
                            <ExternalLink className="size-3.5" />
                            <span className="text-xs">View PDF</span>
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400">No PDF</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={cn(colWidth('actions'), 'shrink-0')}>
                      <div className="flex items-center gap-1.5">
                        {!alreadyResponded && acceptedStage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="size-7"
                                disabled={moving}
                                onClick={() => onMoveToStage(candidate.applicationId, acceptedStage)}
                                aria-label={`Manually accept ${name}`}
                              >
                                {moving ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <CircleCheck className="size-3.5 text-success-text" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manual accept</TooltipContent>
                          </Tooltip>
                        )}
                        {!alreadyResponded && rejectedStage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="size-7"
                                disabled={moving}
                                onClick={() => onMoveToStage(candidate.applicationId, rejectedStage)}
                                aria-label={`Manually reject ${name}`}
                              >
                                {moving ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <CircleX className="size-3.5 text-destructive-text" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manual reject</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-surface py-16 text-center text-sm text-neutral-400">
              No candidates match your search.
            </div>
          )}
        </div>

        {/* ── Layer 4: Pagination ── */}
        {totalFiltered > 0 && (
          <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
            <OfferPagination
              page={page}
              totalPages={totalPages}
              total={totalFiltered}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
