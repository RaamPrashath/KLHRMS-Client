'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  FileText,
  Gauge,
  LinkIcon,
  Loader2,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CandidateMergedProfile } from '@/modules/candidates/components/CandidateMergedProfile';
import {
  useCandidateApplicationDetail,
  useCreateCandidateApplicationNote,
  useCandidateResumeAnalysis,
  useRetryCandidateResumeAnalysis,
  useUpdateCandidateApplicationNote,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  ApplicationInterviewEvent,
  CandidateApplicationDetail,
  CandidateApplicationNote,
  CandidateResumeAnalysis,
  StageHistoryItem,
} from '@/modules/candidates/types/atsTypes';

type TimelineEntry =
  | { type: 'applied'; id: string; at: string; stageName: string; history?: never; interviews?: never }
  | { type: 'stage'; id: string; at: string; stageName: string; history: StageHistoryItem; interviews: ApplicationInterviewEvent[] };

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function statusTone(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'REJECTED') return 'destructive';
  if (status === 'FINALIZED' || status === 'COMPLETED' || status === 'APPROVED') return 'default';
  if (status === 'PENDING' || status === 'ONGOING') return 'secondary';
  return 'outline';
}

function candidateInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C';
}

function buildTimeline(detail: CandidateApplicationDetail): TimelineEntry[] {
  const interviewsByStage = new Map<string, ApplicationInterviewEvent[]>();
  for (const event of detail.interviewEvents ?? []) {
    const current = interviewsByStage.get(event.stageId) ?? [];
    current.push(event);
    interviewsByStage.set(event.stageId, current);
  }

  const stageEntries: TimelineEntry[] = (detail.stageHistory ?? []).map((history) => ({
    type: 'stage',
    id: history.id,
    at: history.createdAt,
    stageName: history.toStageName ?? detail.currentStage,
    history,
    interviews: interviewsByStage.get(history.toStageId) ?? [],
  }));

  const historyStageIds = new Set((detail.stageHistory ?? []).map((history) => history.toStageId));
  for (const event of detail.interviewEvents ?? []) {
    if (historyStageIds.has(event.stageId)) continue;
    stageEntries.push({
      type: 'stage',
      id: `event-stage-${event.stageId}`,
      at: event.scheduledStartAt ?? event.createdAt,
      stageName: event.stageName ?? 'Interview',
      history: {
        id: `event-history-${event.stageId}`,
        fromStageId: null,
        fromStageName: null,
        toStageId: event.stageId,
        toStageName: event.stageName,
        movedByMemberId: null,
        movedByName: event.createdByName,
        note: null,
        createdAt: event.createdAt,
      },
      interviews: [event],
    });
  }

  const appliedEntry: TimelineEntry = {
    type: 'applied',
    id: 'applied',
    at: detail.appliedAt,
    stageName: 'Applied',
  };

  return [...stageEntries, appliedEntry].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly icon: typeof Mail;
}) {
  return (
    <div className="grid grid-cols-[24px_112px_minmax(0,1fr)] items-center gap-3 border-b border-neutral-100 py-3 last:border-b-0">
      <Icon className="size-4 text-neutral-400" />
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="min-w-0 truncate text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function LinkRow({
  label,
  href,
  icon: Icon,
}: {
  readonly label: string;
  readonly href: string | null;
  readonly icon: typeof LinkIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-4 shrink-0 text-neutral-400" />
        <span className="truncate text-sm font-medium text-neutral-900">{label}</span>
      </div>
      {href ? (
        <Button asChild size="sm" variant="ghost" className="h-8 shrink-0 px-2 text-primary">
          <a href={href} target="_blank" rel="noreferrer">
            Open
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      ) : (
        <span className="shrink-0 text-xs text-neutral-500">Not provided</span>
      )}
    </div>
  );
}

function ProfileTab({
  detail,
  analysis,
  isAnalysisLoading,
  analysisError,
  retrying,
  onRetry,
  orgSlug,
  memberId,
}: {
  readonly detail: CandidateApplicationDetail;
  readonly analysis?: CandidateResumeAnalysis;
  readonly isAnalysisLoading: boolean;
  readonly analysisError: Error | null;
  readonly retrying: boolean;
  readonly onRetry: () => void;
  readonly orgSlug: string;
  readonly memberId: string;
}) {
  return (
    <CandidateMergedProfile
      detail={detail}
      analysis={analysis}
      isAnalysisLoading={isAnalysisLoading}
      analysisError={analysisError}
      retryingAnalysis={retrying}
      onRetryAnalysis={onRetry}
      orgSlug={orgSlug}
      memberId={memberId}
    />
  );
}

function confidenceLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not found';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function analysisStatusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-success-bg text-success-text';
  if (status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'UNSUPPORTED') return 'bg-neutral-50 text-neutral-500';
  return 'bg-info-bg text-info-text';
}

function AnalysisStatusPanel({
  analysis,
  onRetry,
  retrying,
}: {
  readonly analysis: CandidateResumeAnalysis;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}) {
  const isWorking = analysis.status === 'PENDING' || analysis.status === 'PROCESSING' || analysis.status === 'TEXT_EXTRACTED';
  const isFailed = analysis.status === 'FAILED';

  return (
    <section className="rounded-lg border border-neutral-100 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', analysisStatusClass(analysis.status))}>
              {isWorking ? 'Analyzing' : analysis.status}
            </span>
            {analysis.evaluationStatus ? (
              <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {analysis.evaluationStatus}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {isWorking
              ? 'Resume analysis is queued or running in the background.'
              : isFailed
                ? analysis.lastError ?? 'Resume analysis failed.'
                : 'AI facts and deterministic score are stored with this application.'}
          </p>
        </div>
        {!isWorking ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
            {retrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            {isFailed ? 'Retry' : 'Re-analyze'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function AtsScoreTab({
  analysis,
  isLoading,
  error,
  onRetry,
  retrying,
}: {
  readonly analysis?: CandidateResumeAnalysis;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-canvas px-6 text-center">
        <div>
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-neutral-300 shadow-[var(--shadow-1)]">
            <Gauge className="size-5" />
          </div>
          <p className="text-sm font-medium text-neutral-900">No ATS analysis yet</p>
          <p className="mt-1 text-xs text-neutral-500">
            {error ? 'Analysis was not found for this application.' : 'The candidate remains visible while analysis runs.'}
          </p>
        </div>
      </div>
    );
  }

  const facts = analysis.extractedFacts;
  const skills = facts?.skills ?? [];
  const certifications = facts?.certifications ?? [];
  const warnings = facts?.warnings ?? [];
  const failedKnockouts = analysis.failedKnockouts ?? [];
  const firewallFlags = analysis.firewallFlags ?? [];
  const removedSuspiciousText = analysis.removedSuspiciousText ?? [];
  const parserWarnings = analysis.parserWarnings ?? [];
  const isRecommended = (analysis.compositeScore ?? 0) >= 70 && analysis.evaluationStatus === 'QUALIFIED';

  return (
    <div className="space-y-5">
      <AnalysisStatusPanel analysis={analysis} onRetry={onRetry} retrying={retrying} />

      <section className="rounded-lg border border-neutral-100 bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">AI ATS score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-mono text-3xl font-semibold text-neutral-900">
                {analysis.compositeScore ?? '—'}
              </span>
              <span className="pb-1 text-sm text-neutral-500">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Raw {analysis.rawScore ?? '—'} / {analysis.maxScore ?? '—'} · confidence {confidenceLabel(analysis.extractionConfidence)}
            </p>
          </div>
          {isRecommended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-text">
              <Sparkles className="size-3.5" />
              Recommended
            </span>
          ) : null}
        </div>
      </section>

      {analysis.isFlaggedForCheating ? (
        <section className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning-text" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-warning-text">Suspicious hidden resume text found</p>
              <p className="mt-1 text-sm text-warning-text/90">
                These snippets were removed before sending resume text to AI. This is a warning, not an automatic rejection.
              </p>
              <div className="mt-3 space-y-2">
                {[...firewallFlags, ...removedSuspiciousText].slice(0, 6).map((item, index) => {
                  const record = item as Record<string, unknown>;
                  const type = record.type as string ?? '';
                  const text = record.text as string ?? '';
                  const details = record.details as string ?? '';
                  const severity = record.severity as string ?? '';
                  const page = record.page as number ?? 1;
                  return (
                    <div key={`${type}-${index}`} className="rounded-md border border-warning-border bg-surface px-3 py-2.5 text-xs text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-warning-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-warning-text">{type}</span>
                        {severity ? (
                          <span className="text-[10px] text-neutral-400">({severity})</span>
                        ) : null}
                        <span className="ml-auto text-[10px] text-neutral-400">page {page}</span>
                      </div>
                      {details ? (
                        <p className="mt-1 text-neutral-600">{details}</p>
                      ) : null}
                      {text ? (
                        <p className="mt-1 font-mono text-warning-text">
                          <span className="font-semibold">Text:</span> &ldquo;{text}&rdquo;
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {failedKnockouts.length > 0 ? (
        <section className="rounded-lg border border-destructive-border bg-destructive-bg p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive-text">
            <AlertTriangle className="size-4" />
            Knockout rules failed
          </p>
          <div className="space-y-2">
            {failedKnockouts.map((item, index) => (
              <div key={`${item.type ?? 'knockout'}-${index}`} className="rounded-md bg-surface px-3 py-2 text-xs text-neutral-700">
                <span className="font-semibold text-neutral-900">{item.type ?? 'Rule'}</span>
                <span className="ml-2">Required {formatUnknown(item.required ?? item.missing)}, found {formatUnknown(item.found)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {facts?.explicitKnockoutRule ? (
        <section className="rounded-lg border border-neutral-100 bg-surface p-4">
          <p className="text-sm font-semibold text-neutral-900">Explicit knockout rule</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{facts.explicitKnockoutRule}</p>
          {facts.explicitKnockoutAssessment ? (
            <div
              className={cn(
                'mt-3 rounded-md px-3 py-2',
                facts.explicitKnockoutAssessment.passed ? 'bg-success-bg' : 'bg-destructive-bg',
              )}
            >
              <p className="text-sm font-medium text-neutral-900">
                {facts.explicitKnockoutAssessment.passed ? 'Passed' : 'Failed'}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {facts.explicitKnockoutAssessment.evidence} · {confidenceLabel(facts.explicitKnockoutAssessment.confidence)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-warning-text">This rule could not be assessed automatically.</p>
          )}
        </section>
      ) : null}

      <section className="rounded-lg border border-neutral-100 bg-surface p-4">
        <p className="text-sm font-semibold text-neutral-900">Extracted facts</p>
        <div className="mt-3 grid gap-3">
          {facts?.targetRoleAlignment ? (
            <div
              className={cn(
                'rounded-md px-3 py-2',
                facts.targetRoleAlignment.matchesTargetRole ? 'bg-success-bg' : 'bg-destructive-bg',
              )}
            >
              <p className="text-xs font-medium text-neutral-500">Target role alignment</p>
              <p className="mt-1 text-sm text-neutral-900">
                {facts.targetRoleAlignment.matchesTargetRole ? 'Matches target role' : 'Does not match target role'}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {facts.targetRoleAlignment.evidence} · {confidenceLabel(facts.targetRoleAlignment.confidence)}
              </p>
            </div>
          ) : null}
          <div className="rounded-md bg-neutral-50 px-3 py-2">
            <p className="text-xs font-medium text-neutral-500">Relevant experience</p>
            <p className="mt-1 text-sm text-neutral-900">
              {facts?.yearsExperience ? `${facts.yearsExperience.value} years` : 'Not found'}
            </p>
            {facts?.yearsExperience ? (
              <p className="mt-1 text-xs text-neutral-500">
                {facts.yearsExperience.evidence} · {confidenceLabel(facts.yearsExperience.confidence)}
              </p>
            ) : null}
          </div>
          <div className="rounded-md bg-neutral-50 px-3 py-2">
            <p className="text-xs font-medium text-neutral-500">Education</p>
            <p className="mt-1 text-sm text-neutral-900">{facts?.degree?.value ?? 'Not found'}</p>
            {facts?.degree ? (
              <p className="mt-1 text-xs text-neutral-500">
                {facts.degree.evidence} · {confidenceLabel(facts.degree.confidence)}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-100 bg-surface p-4">
        <p className="text-sm font-semibold text-neutral-900">Extracted skills</p>
        {skills.length > 0 ? (
          <div className="mt-3 space-y-2">
            {skills.map((skill) => (
              <div key={`${skill.normalizedSkill ?? skill.skill}-${skill.evidence}`} className="rounded-md border border-neutral-100 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900">{skill.normalizedSkill ?? skill.skill}</p>
                  <span className="font-mono text-xs text-neutral-500">{confidenceLabel(skill.confidence)}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{skill.evidence}</p>
                {!skill.normalizedSkill ? (
                  <p className="mt-1 text-xs text-warning-text">Not mapped to a weighted job skill</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No skills were extracted.</p>
        )}
      </section>

      {certifications.length > 0 || warnings.length > 0 || parserWarnings.length > 0 ? (
        <section className="rounded-lg border border-neutral-100 bg-surface p-4">
          <p className="text-sm font-semibold text-neutral-900">Review notes</p>
          <div className="mt-3 space-y-2 text-xs text-neutral-600">
            {certifications.map((certification) => (
              <p key={`${certification.value}-${certification.evidence}`}>
                Certification: {certification.value} · {confidenceLabel(certification.confidence)}
              </p>
            ))}
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            {parserWarnings.map((warning, index) => (
              <p key={`${formatUnknown(warning)}-${index}`}>{formatUnknown(warning)}</p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FeedbackTable({ event }: { readonly event: ApplicationInterviewEvent }) {
  const feedbacks = event.feedbacks ?? [];
  if (feedbacks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 bg-canvas px-3 py-3 text-sm text-neutral-500">
        No feedback notes submitted for this interview yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-neutral-100 bg-surface">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="px-3 py-2 whitespace-nowrap">Assigned by</th>
              <th className="px-3 py-2 whitespace-nowrap">Status</th>
              <th className="px-3 py-2 whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {feedbacks.map((feedback) => (
              <tr key={feedback.id} className="hover:bg-neutral-50 transition-colors">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-900">{feedback.memberName}</td>
                <td className="px-3 py-2">
                  <Badge variant={statusTone(feedback.outcome)} className="text-xs">{feedback.outcome}</Badge>
                </td>
                <td className="max-w-[12.5rem] px-3 py-2 text-neutral-600 text-xs">{feedback.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterviewBlock({ event, index }: { readonly event: ApplicationInterviewEvent; readonly index: number }) {
  const lead = event.participants[0];
  const guests = event.participants.filter((participant) => participant.memberId !== lead?.memberId);

  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 transition-colors hover:bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm font-semibold text-neutral-900">Interview {index + 1}</p>
            <Badge variant={statusTone(event.status)} className="text-xs">{event.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            {formatDateTime(event.scheduledStartAt)}
            {event.durationMinutes ? ` - ${event.durationMinutes} min` : ''}
          </p>
        </div>
        {event.meetingUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={event.meetingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Join meeting
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-md border border-neutral-100 bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Interview panel</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-neutral-900 font-medium">
              <div className="size-6 rounded-lg bg-primary-ghost text-primary flex items-center justify-center text-xs font-semibold">
                <UserRound className="size-3.5" />
              </div>
              <span className="truncate">{lead?.name ?? event.createdByName ?? 'Unassigned'}</span>
            </div>
            {guests.length > 0 ? (
              <div className="flex items-start gap-2.5 text-sm text-neutral-700">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <span className="text-xs">{guests.map((guest) => guest.name).join(', ')}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 ml-7">No additional guests</p>
            )}
            {event.completedByName ? (
              <div className="flex items-center gap-2.5 text-sm text-success-text font-medium mt-2 pt-2 border-t border-neutral-100">
                <CheckCircle2 className="size-4" />
                <span className="text-xs">Completed by {event.completedByName}</span>
              </div>
            ) : null}
          </div>
        </div>
        <FeedbackTable event={event} />
      </div>
    </div>
  );
}

function HistoryTab({ detail }: { readonly detail: CandidateApplicationDetail }) {
  const timeline = useMemo(() => buildTimeline(detail), [detail]);

  return (
    <div className="relative pl-6">
      <div className="absolute bottom-8 left-[11px] top-4 w-px bg-neutral-200" />
      <div className="space-y-6">
        {timeline.map((entry) => (
          <div key={entry.id} className="relative">
            <span className="absolute -left-[25px] top-5 flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-surface text-neutral-600 shadow-sm">
              {entry.type === 'applied' ? <FileDown className="size-4" /> : <ArrowRight className="size-3.5" />}
            </span>
            <section className="rounded-lg border border-neutral-100 bg-surface p-4 transition-colors hover:bg-neutral-50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    {entry.type === 'applied'
                      ? `Applied to ${detail.jobPostingTitle}`
                      : `Moved to ${entry.stageName}`}
                  </p>
                  {entry.type === 'stage' && entry.history.movedByName ? (
                    <p className="mt-1 text-xs text-neutral-600">by {entry.history.movedByName}</p>
                  ) : null}
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-xs font-semibold text-neutral-900">{formatDate(entry.at)}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(entry.at)}</p>
                </div>
              </div>

              {entry.type === 'stage' && entry.history.note ? (
                <p className="mt-3 rounded-md border border-neutral-100 bg-surface px-3 py-2 text-sm text-neutral-700">{entry.history.note}</p>
              ) : null}

              {entry.type === 'stage' && entry.interviews.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {entry.interviews.map((event, index) => (
                    <InterviewBlock key={event.id} event={event} index={index} />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  draft,
  onDraftChange,
  onSave,
  saving,
}: {
  readonly note: CandidateApplicationNote;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onSave: () => Promise<void> | void;
  readonly saving: boolean;
}) {
  const initials = candidateInitials(note.authorName);
  const [editing, setEditing] = useState(false);

  async function handleSave() {
    await onSave();
    setEditing(false);
  }

  return (
    <article className="group flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-ghost text-xs font-semibold text-primary ring-1 ring-primary-light/30">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-neutral-900">{note.authorName}</p>
            <span className="text-xs text-neutral-400">{formatDateTime(note.updatedAt)}</span>
          </div>
          {note.canEdit && !editing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-neutral-500 opacity-0 transition-opacity hover:text-neutral-900 group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-[var(--shadow-1)]">
          {editing ? (
            <div className="space-y-3">
              <Textarea
                className="min-h-28 resize-y border-neutral-200 text-sm leading-6"
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onDraftChange(note.body);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => { void handleSave(); }} disabled={saving || !draft.trim() || draft === note.body}>
                  <Save className="size-4" />
                  {saving ? 'Saving' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm prose-neutral max-w-none text-sm leading-6 text-neutral-700 [&_p]:my-0 [&_p]:leading-6" dangerouslySetInnerHTML={{ __html: note.body }} />
          )}
        </div>
      </div>
    </article>
  );
}

function NotesEmptyState() {
  return (
    <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-canvas px-6 text-center">
      <div>
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface text-neutral-300 shadow-[var(--shadow-1)]">
          <MessageSquareText className="size-5" />
        </div>
        <p className="text-sm font-medium text-neutral-900">No notes yet</p>
        <p className="mt-1 text-xs text-neutral-500">Start the conversation with the hiring team.</p>
      </div>
    </div>
  );
}

function NotesComposer({
  value,
  onChange,
  onSubmit,
  pending,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}) {
  return (
    <form
      className="shrink-0 bg-surface px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="rounded-xl border border-neutral-200 bg-surface p-3 shadow-[var(--shadow-1)] focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/10">
        <Textarea
          className="min-h-24 resize-none border-0 p-0 text-sm leading-6 shadow-none focus-visible:ring-0"
          placeholder="Add a note..."
          value={value}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">{value.trim().length}/1000</p>
          <Button type="submit" size="sm" disabled={pending || !value.trim()}>
            <Send className="size-4" />
            {pending ? 'Adding' : 'Add note'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function NotesTab({
  detail,
  createNote,
  updateNote,
}: {
  readonly detail: CandidateApplicationDetail;
  readonly createNote: ReturnType<typeof useCreateCandidateApplicationNote>;
  readonly updateNote: ReturnType<typeof useUpdateCandidateApplicationNote>;
}) {
  const [composer, setComposer] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function handleCreate() {
    if (!composer.trim()) return;
    await createNote.mutateAsync({ applicationId: detail.id, body: composer.trim() });
    setComposer('');
  }

  async function handleUpdate(note: CandidateApplicationNote) {
    const body = drafts[note.id]?.trim();
    if (!body || body === note.body) return;
    await updateNote.mutateAsync({ applicationId: detail.id, noteId: note.id, body });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {(detail.notes ?? []).length === 0 ? (
          <NotesEmptyState />
        ) : (
          <div className="space-y-5">
            {detail.notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                draft={drafts[note.id] ?? note.body}
                onDraftChange={(value) => setDrafts((current) => ({ ...current, [note.id]: value }))}
                onSave={() => handleUpdate(note)}
                saving={updateNote.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <NotesComposer
        value={composer}
        onChange={setComposer}
        onSubmit={() => { void handleCreate(); }}
        pending={createNote.isPending}
      />
    </div>
  );
}

export function CandidateDrawer({
  orgSlug,
  memberId,
  applicationId,
  open,
  onOpenChange,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly applicationId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useCandidateApplicationDetail(orgSlug, memberId, applicationId);
  const resumeAnalysisQuery = useCandidateResumeAnalysis(orgSlug, memberId, applicationId);
  const retryResumeAnalysis = useRetryCandidateResumeAnalysis(orgSlug, memberId);
  const createNote = useCreateCandidateApplicationNote(orgSlug, memberId);
  const updateNote = useUpdateCandidateApplicationNote(orgSlug, memberId);
  const detail = detailQuery.data;
  const candidateName = useMemo(
    () => detail ? `${detail.candidate.firstName} ${detail.candidate.lastName}`.trim() : 'Candidate',
    [detail],
  );
  const initials = candidateInitials(candidateName);
  const imageSrc = detail?.candidate.image?.trim() || null;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const candidateImage = imageSrc && failedImageSrc !== imageSrc ? imageSrc : null;
  const [activeSection, setActiveSection] = useState<'profile' | 'notes' | 'history'>('profile');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !bottom-0 !right-0 !left-auto !top-0 z-50 flex h-dvh max-h-dvh w-full !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-none border-0 border-l border-neutral-100 bg-surface p-0 shadow-[var(--shadow-4)] duration-200 data-open:slide-in-from-right-full data-open:zoom-in-100 data-closed:slide-out-to-right-full data-closed:zoom-out-100 sm:w-[40vw]">
        <DialogHeader className="bg-surface px-5 py-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 shrink-0">
              <AvatarImage
                key={imageSrc ?? 'fallback'}
                src={candidateImage ?? undefined}
                alt={candidateName}
                referrerPolicy="no-referrer"
                onError={() => setFailedImageSrc(imageSrc)}
              />
              <AvatarFallback className="bg-primary-ghost text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-2xl font-semibold text-neutral-900">{candidateName}</DialogTitle>
              <p className="mt-1 truncate text-sm text-neutral-500">{detail?.candidate.email ?? '—'}</p>
            </div>
          </div>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="grid gap-4 p-5">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
        ) : null}

        {detail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Pill-style tab bar — matches AtsPipelineSectionLayout design */}
            <div className="bg-surface px-5 py-3">
              <div className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
                {([
                  { key: 'profile' as const, label: 'Profile' },
                  { key: 'notes' as const, label: 'Notes' },
                  { key: 'history' as const, label: 'History' },
                ]).map((tab) => {
                  const isActive = tab.key === activeSection;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveSection(tab.key)}
                      aria-pressed={isActive}
                      className={cn(
                        'relative inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-[color,transform] duration-150 ease-out',
                        isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="candidate-drawer-tab-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 36,
                            mass: 0.65,
                          }}
                        />
                      ) : null}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSection === 'profile' ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <ProfileTab
                  detail={detail}
                  analysis={resumeAnalysisQuery.data}
                  isAnalysisLoading={resumeAnalysisQuery.isLoading}
                  analysisError={resumeAnalysisQuery.error}
                  retrying={retryResumeAnalysis.isPending}
                  orgSlug={orgSlug}
                  memberId={memberId}
                  onRetry={() => {
                    if (!applicationId) return;
                    retryResumeAnalysis.mutate(
                      { applicationId },
                      {
                        onSuccess: () => {
                          toast.success('Resume analysis retry started');
                          void resumeAnalysisQuery.refetch();
                        },
                        onError: (error) => {
                          toast.error(error instanceof Error ? error.message : 'Could not retry analysis');
                        },
                      },
                    );
                  }}
                />
              </div>
            ) : null}

            {activeSection === 'history' ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <HistoryTab detail={detail} />
              </div>
            ) : null}

            {activeSection === 'notes' ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <NotesTab detail={detail} createNote={createNote} updateNote={updateNote} />
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
