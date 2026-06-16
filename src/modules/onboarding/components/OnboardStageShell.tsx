'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Loader2, RotateCcw, Search, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { assignCredentialsAndCreateUserAction } from '@/modules/onboarding/api/onboardingServerActions';
import { useOnboardWorkspace, useRoles } from '@/modules/onboarding/hooks/useOnboarding';
import type { OnboardWorkspace, OnboardWorkspaceCandidate } from '@/modules/onboarding/types/onboardingTypes';

interface OnboardStageShellProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly organizationId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
  readonly initialWorkspace?: OnboardWorkspace;
}

function candidateName(candidate: OnboardWorkspaceCandidate): string {
  return `${candidate.candidate.firstName ?? ''} ${candidate.candidate.lastName ?? ''}`.trim() || 'Unnamed candidate';
}

function credentialStatusClasses(isSent: boolean): string {
  return isSent ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text';
}

function credentialStatusLabel(isSent: boolean): string {
  return isSent ? 'Credentials Sent' : 'Unsent';
}

function hasCredentialsSent(candidate: OnboardWorkspaceCandidate, sentState: Record<string, boolean>): boolean {
  return (
    candidate.onboardingStatus === 'CREDENTIALS_SENT' ||
    Boolean(candidate.credentialsSentAt) ||
    Boolean(sentState[candidate.applicationId])
  );
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

function matchesSearch(candidate: OnboardWorkspaceCandidate, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [candidateName(candidate), candidate.candidate.email]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

export function OnboardStageShell({
  orgSlug,
  memberId,
  organizationId,
  jobSlug,
  stageSlug,
  initialWorkspace,
}: OnboardStageShellProps) {
  const router = useRouter();
  const workspaceQuery = useOnboardWorkspace(orgSlug, memberId, jobSlug, stageSlug, initialWorkspace);
  const workspace = workspaceQuery.data;
  const rolesQuery = useRoles(orgSlug, memberId);
  const roles = rolesQuery.data ?? [];

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sendingState, setSendingState] = useState<Record<string, boolean>>({});
  const [sentState, setSentState] = useState<Record<string, boolean>>({});
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});

  const filteredCandidates = useMemo(
    () =>
      (workspace?.candidates ?? []).filter((candidate) => matchesSearch(candidate, search)),
    [search, workspace?.candidates],
  );

  function handleBackToPipeline() {
    const storageKey = `ats-stage-return:${orgSlug}:${jobSlug}:${stageSlug}`;
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) : null;
    router.push(stored ?? `/${orgSlug}/candidates/${jobSlug}`);
  }

  async function handleSendCredentials(candidate: OnboardWorkspaceCandidate) {
    const recordId = candidate.onboardingRecordId;
    if (!recordId) return;
    const roleId = roleSelections[candidate.applicationId];
    const email = (emailInputs[candidate.applicationId] ?? candidate.candidate.email ?? '').trim();
    if (!roleId) {
      toast.error('Please select a role');
      return;
    }
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setSendingState((prev) => ({ ...prev, [candidate.applicationId]: true }));
    try {
      await assignCredentialsAndCreateUserAction({
        orgSlug,
        memberId,
        recordId,
        data: { roleId, email },
        organizationId,
      });
      toast.success(`Credentials sent to ${candidateName(candidate)}`);
      setSentState((prev) => ({ ...prev, [candidate.applicationId]: true }));
      setRoleSelections((prev) => ({ ...prev, [candidate.applicationId]: '' }));
      setEmailInputs((prev) => ({ ...prev, [candidate.applicationId]: email }));
      queryClient.invalidateQueries({ queryKey: ['onboard-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    } catch (error) {
      toast.error(readActionError(error, 'Failed to send credentials'));
    } finally {
      setSendingState((prev) => ({ ...prev, [candidate.applicationId]: false }));
    }
  }

  if (workspaceQuery.isLoading && !workspace) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-[var(--shadow-1)]">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading onboard workspace
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 text-sm shadow-[var(--shadow-1)]">
          <p className="font-medium text-neutral-900">Onboard workspace was not found.</p>
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
                  <TableHead className="pl-6 pr-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Candidate
                  </TableHead>
                  <TableHead className="px-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[140px] px-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Role
                  </TableHead>
                  <TableHead className="min-w-[180px] px-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Email
                  </TableHead>
                  <TableHead className="pr-6 pl-3 py-3 h-auto whitespace-nowrap text-[12.5px] font-semibold text-neutral-500 text-left">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-surface">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => {
                    const isSending = sendingState[candidate.applicationId] ?? false;
                    const credsSent = hasCredentialsSent(candidate, sentState);
                    const canSend = !credsSent;

                    return (
                      <TableRow
                        key={candidate.applicationId}
                        className="border-black/4 transition-colors hover:bg-black/[0.02]"
                      >
                        <TableCell className="pl-6 pr-3 py-3 whitespace-nowrap text-left">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900">{candidateName(candidate)}</p>
                            <p className="truncate text-xs text-neutral-500">{candidate.candidate.email || 'No email'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-left">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', credentialStatusClasses(credsSent))}>
                            {credentialStatusLabel(credsSent)}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-left">
                          {credsSent ? (
                            <span className="text-xs text-neutral-500">
                              {roles.find((r) => r.id === candidate.assignedRoleId)?.name ?? 'Assigned'}
                            </span>
                          ) : (
                            <Select
                              value={roleSelections[candidate.applicationId] ?? ''}
                              onValueChange={(value) =>
                                setRoleSelections((prev) => ({ ...prev, [candidate.applicationId]: value }))
                              }
                              disabled={!canSend || isSending}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {rolesQuery.isLoading ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : roles.length === 0 ? (
                                  <SelectItem value="none" disabled>No roles available</SelectItem>
                                ) : (
                                  roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap text-left">
                          {credsSent ? (
                            <span className="text-xs text-neutral-500">
                              {candidate.assignedEmail ?? emailInputs[candidate.applicationId] ?? candidate.candidate.email}
                            </span>
                          ) : (
                            <Input
                              value={emailInputs[candidate.applicationId] ?? candidate.candidate.email ?? ''}
                              onChange={(e) =>
                                setEmailInputs((prev) => ({ ...prev, [candidate.applicationId]: e.target.value }))
                              }
                              placeholder="Enter email"
                              className="h-8 text-xs"
                              disabled={!canSend || isSending}
                            />
                          )}
                        </TableCell>
                        <TableCell className="pr-6 pl-3 py-3 whitespace-nowrap text-left">
                          {credsSent ? (
                            <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                              Sent
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className={cn(
                                'h-9 min-w-[104px] justify-center px-4 text-sm font-medium',
                                canSend ? 'bg-primary hover:bg-primary-hover' : 'bg-neutral-200 text-neutral-400',
                              )}
                              disabled={!canSend || isSending}
                              onClick={() => void handleSendCredentials(candidate)}
                            >
                              {isSending ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="size-4" />
                                  Send
                                </>
                              )}
                            </Button>
                          )}
                          {candidate.credentialsEmailError ? (
                            <p className="mt-1 text-xs text-destructive-text">{candidate.credentialsEmailError}</p>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className="border-black/4 hover:bg-transparent">
                    <TableCell colSpan={5} className="py-16 text-center text-sm text-neutral-500">
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
