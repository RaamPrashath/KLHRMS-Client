'use client';

import { ArrowRight, Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface OfferCandidateTableProps {
  readonly candidates: OfferWorkspaceCandidate[];
  readonly selectedApplicationIds: ReadonlySet<string>;
  readonly acceptedStage: OfferStageSummary | null;
  readonly rejectedStage: OfferStageSummary | null;
  readonly visibleSelectableIds: string[];
  readonly movingApplicationId: string | null;
  readonly getCandidateErrors: (candidate: OfferWorkspaceCandidate) => string[];
  readonly onToggleCandidate: (applicationId: string, checked: boolean) => void;
  readonly onToggleAllVisible: (checked: boolean) => void;
  readonly onMoveToStage: (applicationId: string, stage: OfferStageSummary) => void;
}

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
  return status
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function StageAction({
  candidate,
  stage,
  label,
  missingLabel,
  moving,
  onMove,
}: {
  readonly candidate: OfferWorkspaceCandidate;
  readonly stage: OfferStageSummary | null;
  readonly label: string;
  readonly missingLabel: string;
  readonly moving: boolean;
  readonly onMove: (applicationId: string, stage: OfferStageSummary) => void;
}) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={!stage || moving}
      onClick={() => {
        if (stage) onMove(candidate.applicationId, stage);
      }}
    >
      {moving ? <Loader2 className="size-3 animate-spin" /> : <ArrowRight className="size-3" />}
      {label}
    </Button>
  );

  if (stage) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{button}</span>
      </TooltipTrigger>
      <TooltipContent>{missingLabel}</TooltipContent>
    </Tooltip>
  );
}

export function OfferCandidateTable({
  candidates,
  selectedApplicationIds,
  acceptedStage,
  rejectedStage,
  visibleSelectableIds,
  movingApplicationId,
  getCandidateErrors,
  onToggleCandidate,
  onToggleAllVisible,
  onMoveToStage,
}: OfferCandidateTableProps) {
  const selectedVisibleCount = visibleSelectableIds.filter((id) => selectedApplicationIds.has(id)).length;
  const allVisibleSelected = visibleSelectableIds.length > 0 && selectedVisibleCount === visibleSelectableIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <Table>
          <TableHeader className="bg-canvas">
            <TableRow className="hover:bg-canvas">
              <TableHead className="w-10 px-4 py-2.5">
                <Checkbox
                  aria-label="Select all visible valid candidates"
                  checked={someVisibleSelected ? 'indeterminate' : allVisibleSelected}
                  disabled={visibleSelectableIds.length === 0}
                  onCheckedChange={(checked) => onToggleAllVisible(checked === true)}
                />
              </TableHead>
              <TableHead className="min-w-[260px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Candidate
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Offer status
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Last sent
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Expires
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Responded
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Resume
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Latest PDF
              </TableHead>
              <TableHead className="min-w-[220px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length > 0 ? (
              candidates.map((candidate) => {
                const errors = getCandidateErrors(candidate);
                const selectable = errors.length === 0;
                const checked = selectedApplicationIds.has(candidate.applicationId);
                const name = candidateName(candidate);
                const moving = movingApplicationId === candidate.applicationId;

                return (
                  <TableRow
                    key={candidate.applicationId}
                    data-state={checked ? 'selected' : undefined}
                    className={cn(
                      'border-b border-neutral-100 hover:bg-canvas',
                      checked && 'border-l-[3px] border-l-primary bg-primary-ghost',
                    )}
                  >
                    <TableCell className="px-4 py-2">
                      <Checkbox
                        aria-label={`Select ${name}`}
                        checked={checked}
                        disabled={!selectable}
                        onCheckedChange={(value) => onToggleCandidate(candidate.applicationId, value === true)}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{name}</p>
                        <p className="truncate text-xs text-neutral-500">{candidate.candidate.email || 'No email'}</p>
                        {errors.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {errors.map((error) => (
                              <span
                                key={error}
                                className="rounded-full bg-destructive-bg px-2 py-0.5 text-xs font-medium text-destructive-text"
                              >
                                {error}
                              </span>
                            ))}
                          </div>
                        ) : candidate.eligibility.warnings.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {candidate.eligibility.warnings.map((warning) => (
                              <span
                                key={warning}
                                className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text"
                              >
                                {warning}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="max-w-[220px]">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(candidate.offerStatus))}>
                          {statusLabel(candidate.offerStatus)}
                        </span>
                        {candidate.latestOffer?.emailError ? (
                          <p className="mt-1 line-clamp-2 text-xs text-destructive-text">
                            {candidate.latestOffer.emailError}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 font-mono text-xs text-neutral-500">
                      {formatDate(candidate.latestOffer?.sentAt ?? candidate.latestOffer?.emailSentAt)}
                    </TableCell>
                    <TableCell className="px-4 py-2 font-mono text-xs text-neutral-500">
                      {formatDate(candidate.latestOffer?.expiresAt)}
                    </TableCell>
                    <TableCell className="px-4 py-2 font-mono text-xs text-neutral-500">
                      {formatDate(candidate.latestOffer?.respondedAt)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <ResumePreviewAction resumeUrl={candidate.candidate.resumeUrl} candidateName={name} />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {candidate.latestOffer?.pdfUrl ? (
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-neutral-700">
                          <a
                            href={candidate.latestOffer.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Download latest offer PDF for ${name}`}
                          >
                            <Download className="size-3.5" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400">No PDF</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StageAction
                          candidate={candidate}
                          stage={acceptedStage}
                          label="Accepted"
                          missingLabel="No Accepted stage configured"
                          moving={moving}
                          onMove={onMoveToStage}
                        />
                        <StageAction
                          candidate={candidate}
                          stage={rejectedStage}
                          label="Rejected"
                          missingLabel="No Rejected stage configured"
                          moving={moving}
                          onMove={onMoveToStage}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-28 px-4 text-center text-sm text-neutral-500">
                  No candidates in this offer stage.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
