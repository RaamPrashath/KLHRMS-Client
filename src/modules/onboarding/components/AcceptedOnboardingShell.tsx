'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RotateCcw, Search, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAcceptedOnboardingWorkspace, useSendOnboardingRequests } from '@/modules/onboarding/hooks/useOnboarding';
import type { AcceptedOnboardingCandidate, AcceptedOnboardingWorkspace } from '@/modules/onboarding/types/onboardingTypes';

interface AcceptedOnboardingShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
  readonly initialWorkspace?: AcceptedOnboardingWorkspace;
}

function candidateName(candidate: AcceptedOnboardingCandidate): string {
  return `${candidate.candidate.firstName ?? ''} ${candidate.candidate.lastName ?? ''}`.trim() || 'Unnamed candidate';
}

function statusClasses(status: string): string {
  if (status === 'CREDENTIALS_SENT') return 'bg-success-bg text-success-text';
  if (status === 'DOCUMENTS_SUBMITTED') return 'bg-info-bg text-info-text';
  if (status === 'PENDING') return 'bg-warning-bg text-warning-text';
  if (status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  return 'bg-neutral-50 text-neutral-500';
}

function statusLabel(status: string): string {
  if (status === 'UNSENT') return 'Unsent';
  if (status === 'PENDING') return 'Pending';
  if (status === 'DOCUMENTS_SUBMITTED') return 'Docs Submitted';
  if (status === 'CREDENTIALS_SENT') return 'Credentials Sent';
  if (status === 'FAILED') return 'Failed';
  return status;
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function matchesSearch(candidate: AcceptedOnboardingCandidate, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [candidateName(candidate), candidate.candidate.email]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

export function AcceptedOnboardingShell({
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
  initialWorkspace,
}: AcceptedOnboardingShellProps) {
  const router = useRouter();
  const workspaceQuery = useAcceptedOnboardingWorkspace(orgSlug, memberId, jobSlug, stageSlug, initialWorkspace);
  const workspace = workspaceQuery.data;
  const sendRequests = useSendOnboardingRequests(orgSlug, memberId, jobSlug, stageSlug);

  const [search, setSearch] = useState('');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<string>>(new Set());

  const filteredCandidates = useMemo(
    () =>
      (workspace?.candidates ?? []).filter((candidate) => matchesSearch(candidate, search)),
    [search, workspace?.candidates],
  );

  const visibleSelectableIds = useMemo(
    () =>
      filteredCandidates
        .filter((c) => c.onboardingStatus === 'UNSENT' || c.onboardingStatus === 'PENDING')
        .map((c) => c.applicationId),
    [filteredCandidates],
  );

  const allVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedApplicationIds.has(id));
  const someVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.some((id) => selectedApplicationIds.has(id)) && !allVisibleSelected;

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
        for (const id of visibleSelectableIds) next.add(id);
      } else {
        for (const id of visibleSelectableIds) next.delete(id);
      }
      return next;
    });
  }

  async function handleSend() {
    const ids = Array.from(selectedApplicationIds);
    if (ids.length === 0) return;
    try {
      await sendRequests.mutateAsync({ applicationIds: ids });
      setSelectedApplicationIds(new Set());
      toast.success(`Onboarding emails sent to ${ids.length} candidate(s)`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to send onboarding requests'));
    }
  }

  function handleBackToPipeline() {
    const storageKey = `ats-stage-return:${orgSlug}:${jobSlug}:${stageSlug}`;
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) : null;
    router.push(stored ?? `/${orgSlug}/candidates/${jobSlug}`);
  }

  if (workspaceQuery.isLoading && !workspace) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-[var(--shadow-1)]">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading onboarding workspace
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
          <p className="font-medium text-neutral-900">Onboarding workspace was not found.</p>
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
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedApplicationIds.size > 0 ? (
            <span className="rounded-lg bg-primary-ghost px-3 py-1 text-xs font-medium text-primary">
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
            disabled={selectedApplicationIds.size === 0 || sendRequests.isPending}
            onClick={handleSend}
          >
            {sendRequests.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send Onboarding Email
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search candidates"
            placeholder="Search candidates"
            className="bg-neutral-50 pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
        <Table>
          <TableHeader className="bg-canvas">
            <TableRow className="hover:bg-canvas">
              <TableHead className="w-10 px-4 py-2.5">
                <Checkbox
                  aria-label="Select all selectable candidates"
                  checked={someVisibleSelected ? 'indeterminate' : allVisibleSelected}
                  disabled={visibleSelectableIds.length === 0}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
              </TableHead>
              <TableHead className="min-w-[260px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Candidate
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Onboarding Status
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Token Sent
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Submitted
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate) => {
                const selectable = candidate.onboardingStatus === 'UNSENT' || candidate.onboardingStatus === 'PENDING';
                const checked = selectedApplicationIds.has(candidate.applicationId);

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
                        aria-label={`Select ${candidateName(candidate)}`}
                        checked={checked}
                        disabled={!selectable}
                        onCheckedChange={(value) => toggleCandidate(candidate.applicationId, value === true)}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{candidateName(candidate)}</p>
                        <p className="truncate text-xs text-neutral-500">{candidate.candidate.email || 'No email'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(candidate.onboardingStatus))}>
                        {statusLabel(candidate.onboardingStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2 font-mono text-xs text-neutral-500">
                      {candidate.latestOnboarding?.tokenSentAt
                        ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(candidate.latestOnboarding.tokenSentAt))
                        : '-'}
                    </TableCell>
                    <TableCell className="px-4 py-2 font-mono text-xs text-neutral-500">
                      {candidate.latestOnboarding?.submittedAt
                        ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(candidate.latestOnboarding.submittedAt))
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-28 px-4 text-center text-sm text-neutral-500">
                  No candidates in this stage.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
