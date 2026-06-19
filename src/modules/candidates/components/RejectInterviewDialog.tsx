'use client';

import { Loader2, Shuffle, UserMinus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useFetchHiringTeams,
  useStageWorkspace,
  useStageWorkspaceByJobSlug,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type { RejectInterviewRequest } from '@/modules/candidates/types/atsTypes';

interface RejectInterviewTarget {
  eventId: string;
  jobPostingId: string;
  stageId: string;
  stageSlug?: string | null;
  jobSlug?: string | null;
  candidateName: string;
}

type RejectMode = RejectInterviewRequest['mode'];
type ReassignableTeamMember = {
  memberId: string;
  name: string | null;
  email: string | null;
};

export function RejectInterviewDialog({
  open,
  interview,
  orgSlug,
  memberId,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  readonly open: boolean;
  readonly interview: RejectInterviewTarget | null;
  readonly orgSlug: string;
  readonly memberId: string;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (payload: RejectInterviewRequest) => void;
}) {
  const [mode, setMode] = useState<RejectMode>('AUTO');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const teamsQuery = useFetchHiringTeams(orgSlug, memberId, interview?.jobPostingId ?? null, interview?.stageId ?? null);
  const stageWorkspaceQuery = useStageWorkspace(orgSlug, memberId, interview?.jobSlug ? '' : (interview?.stageSlug ?? ''));
  const jobStageWorkspaceQuery = useStageWorkspaceByJobSlug(
    orgSlug,
    memberId,
    interview?.jobSlug ?? null,
    interview?.stageSlug ?? null,
  );

  const teamMembers = useMemo(() => {
    const membersById = new Map<string, ReassignableTeamMember>();
    const workspaceMembers = interview?.jobSlug
      ? (jobStageWorkspaceQuery.data?.teamMembers ?? [])
      : (stageWorkspaceQuery.data?.teamMembers ?? []);
    const workspaceCandidates = interview?.jobSlug
      ? (jobStageWorkspaceQuery.data?.candidates ?? [])
      : (stageWorkspaceQuery.data?.candidates ?? []);

    for (const teamMember of workspaceMembers) {
      if (teamMember.memberId === memberId) continue;
      membersById.set(teamMember.memberId, {
        memberId: teamMember.memberId,
        name: teamMember.name,
        email: teamMember.email,
      });
    }

    for (const candidate of workspaceCandidates) {
      const interviewer = candidate.currentAssignment?.interviewer;
      if (!interviewer || interviewer.memberId === memberId) continue;
      membersById.set(interviewer.memberId, {
        memberId: interviewer.memberId,
        name: interviewer.name,
        email: interviewer.email,
      });
    }

    for (const team of teamsQuery.data?.items ?? []) {
      for (const teamMember of team.members) {
        if (teamMember.memberId === memberId) continue;
        if (membersById.has(teamMember.memberId)) continue;
        membersById.set(teamMember.memberId, {
          memberId: teamMember.memberId,
          name: teamMember.name,
          email: teamMember.email,
        });
      }
    }
    return Array.from(membersById.values()).sort((left, right) => {
      const leftLabel = left.name ?? left.email ?? '';
      const rightLabel = right.name ?? right.email ?? '';
      return leftLabel.localeCompare(rightLabel);
    });
  }, [
    interview?.jobSlug,
    jobStageWorkspaceQuery.data?.candidates,
    jobStageWorkspaceQuery.data?.teamMembers,
    memberId,
    stageWorkspaceQuery.data?.candidates,
    stageWorkspaceQuery.data?.teamMembers,
    teamsQuery.data?.items,
  ]);

  function resetDialogState() {
    setMode('AUTO');
    setSelectedMemberId(null);
  }

  function submit() {
    if (mode === 'REASSIGN' && !selectedMemberId) return;
    onSubmit({
      mode,
      newInterviewerMemberId: mode === 'REASSIGN' ? selectedMemberId : null,
    });
  }

  const canSubmit = !isSubmitting && (mode !== 'REASSIGN' || Boolean(selectedMemberId));

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetDialogState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject interview assignment</DialogTitle>
          <DialogDescription>
            Choose where {interview?.candidateName ?? 'this candidate'} should go next.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {[
            { value: 'AUTO' as const, label: 'Auto assign least-loaded', icon: Shuffle, help: 'Send it to the available team member with the fewest active interviews.' },
            { value: 'REASSIGN' as const, label: 'Reassign to teammate', icon: UserPlus, help: 'Pick someone from this interview stage team.' },
            { value: 'UNASSIGN' as const, label: 'Unassign', icon: UserMinus, help: 'Return the candidate to the unassigned group for this interview stage.' },
          ].map((option) => {
            const Icon = option.icon;
            const selected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                  selected ? 'border-primary bg-primary-ghost' : 'border-neutral-100 bg-surface hover:bg-neutral-50',
                )}
                onClick={() => setMode(option.value)}
              >
                <Icon className={cn('mt-0.5 size-4', selected ? 'text-primary' : 'text-neutral-400')} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{option.help}</span>
                </span>
              </button>
            );
          })}

          {mode === 'REASSIGN' ? (
            <div className="rounded-xl border border-neutral-100 bg-canvas/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Interview team</p>
              {teamsQuery.isLoading || stageWorkspaceQuery.isLoading || jobStageWorkspaceQuery.isLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-neutral-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading team
                </div>
              ) : null}
              {!teamsQuery.isLoading && !stageWorkspaceQuery.isLoading && !jobStageWorkspaceQuery.isLoading && teamMembers.length === 0 ? (
                <p className="py-2 text-sm text-neutral-500">No other team members are in this interview team.</p>
              ) : null}
              <div className="grid gap-2">
                {teamMembers.map((teamMember) => {
                  const selected = selectedMemberId === teamMember.memberId;
                  return (
                    <button
                      key={teamMember.memberId}
                      type="button"
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left transition-colors',
                        selected ? 'border-primary bg-surface text-primary' : 'border-neutral-100 bg-surface text-neutral-700 hover:bg-neutral-50',
                      )}
                      onClick={() => setSelectedMemberId(teamMember.memberId)}
                    >
                      <span className="block text-sm font-medium">{teamMember.name ?? teamMember.email ?? 'Team member'}</span>
                      {teamMember.email ? <span className="block text-xs text-neutral-500">{teamMember.email}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              resetDialogState();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={submit}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Reject assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
