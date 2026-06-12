'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RotateCcw, Search, Send, X } from 'lucide-react';
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
      toast.success(`File upload links sent to ${ids.length} candidate(s)`);
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
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full pb-7">
      <div className="flex flex-col gap-4 ml-7 mt-7 mr-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1.5 text-neutral-500 hover:text-neutral-900"
            onClick={handleBackToPipeline}
            aria-label="Back to candidate pipeline"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">{workspace.stage.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-500">{workspace.jobPosting.title}</span>
              <span className="size-1 rounded-full bg-neutral-300" />
              <span className="font-mono text-xs font-medium uppercase tracking-wider text-neutral-400">
                {workspace.candidateCount} candidates
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:mt-1.5">
          {selectedApplicationIds.size > 0 ? (
            <span className="rounded-lg bg-primary-ghost px-3 py-1 text-xs font-medium text-primary">
              {selectedApplicationIds.size} selected
            </span>
          ) : null}

          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary-hover"
            disabled={selectedApplicationIds.size === 0 || sendRequests.isPending}
            onClick={handleSend}
          >
            {sendRequests.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send File Upload Link
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 mx-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="flex flex-col gap-2 border-b border-black/[0.04] px-3.5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search candidates"
                  placeholder="Search candidates"
                  className="h-9 border-0 bg-canvas px-3 py-2.5 pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
                />
              </div>
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-canvas/50">
                <TableRow className="border-black/[0.04] hover:bg-transparent">
                  <TableHead className="w-12 pl-6 pr-3 py-3 h-auto whitespace-nowrap">
                    <Checkbox
                      aria-label="Select all selectable candidates"
                      checked={someVisibleSelected ? 'indeterminate' : allVisibleSelected}
                      disabled={visibleSelectableIds.length === 0}
                      onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                    />
                  </TableHead>
                  <TableHead className="px-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Name
                  </TableHead>
                  <TableHead className="px-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Email
                  </TableHead>
                  <TableHead className="pr-6 pl-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-surface">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => {
                    const selectable = candidate.onboardingStatus === 'UNSENT' || candidate.onboardingStatus === 'PENDING';
                    const checked = selectedApplicationIds.has(candidate.applicationId);

                    return (
                      <TableRow
                        key={candidate.applicationId}
                        data-state={checked ? 'selected' : undefined}
                        className={cn(
                          'border-black/4 transition-colors hover:bg-black/[0.02]',
                          checked && 'bg-primary-ghost hover:bg-primary-ghost/80',
                        )}
                      >
                        <TableCell className="w-12 pl-6 pr-3 py-3 whitespace-nowrap">
                          <Checkbox
                            aria-label={`Select ${candidateName(candidate)}`}
                            checked={checked}
                            disabled={!selectable}
                            onCheckedChange={(value) => toggleCandidate(candidate.applicationId, value === true)}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-left">
                          <span className="truncate text-sm font-medium text-neutral-900">{candidateName(candidate)}</span>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-left">
                          <span className="truncate text-xs text-neutral-500">{candidate.candidate.email || 'No email'}</span>
                        </TableCell>
                        <TableCell className="pr-6 pl-3 py-3 whitespace-nowrap text-left">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(candidate.onboardingStatus))}>
                            {statusLabel(candidate.onboardingStatus)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className="border-black/4 hover:bg-transparent">
                    <TableCell colSpan={4} className="py-16 text-center text-sm text-neutral-400">
                      No candidates in this stage.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
