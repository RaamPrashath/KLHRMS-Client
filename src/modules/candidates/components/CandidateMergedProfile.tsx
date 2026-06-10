'use client';

import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  FileText,
  Gauge,
  GraduationCap,
  LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Medal,
  Phone,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { OfferLettersPanel } from '@/modules/offers/components/OfferLettersPanel';
import type {
  CandidateApplicationDetail,
  CandidateResumeAnalysis,
  ResumeProfileSection,
} from '@/modules/candidates/types/atsTypes';

type SkillMatchRecord = {
  skill?: unknown;
  normalizedSkill?: unknown;
  evidence?: unknown;
  confidence?: unknown;
  points?: unknown;
};

type SkillBreakdown = {
  awarded?: unknown;
  max?: unknown;
  matched?: unknown;
  missed?: unknown;
};

type ScoreBreakdown = {
  skills?: SkillBreakdown;
  matchedSkills?: unknown;
  missedSkills?: unknown;
  reviewReasons?: unknown;
  requiresManualReview?: unknown;
};

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

function statusTone(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'REJECTED') return 'destructive';
  if (status === 'FINALIZED' || status === 'COMPLETED' || status === 'APPROVED') return 'default';
  if (status === 'PENDING' || status === 'ONGOING') return 'secondary';
  return 'outline';
}

function confidenceLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value * 100)}%`;
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not found';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function toSkillRecords(value: unknown): SkillMatchRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is SkillMatchRecord => Boolean(item) && typeof item === 'object')
    : [];
}

function scoreBreakdown(analysis?: CandidateResumeAnalysis): ScoreBreakdown {
  return (analysis?.scoreBreakdown ?? {}) as ScoreBreakdown;
}

function getMatchedSkills(analysis?: CandidateResumeAnalysis): SkillMatchRecord[] {
  const breakdown = scoreBreakdown(analysis);
  const rootMatched = toSkillRecords(breakdown.matchedSkills);
  if (rootMatched.length > 0) return rootMatched;
  return toSkillRecords(breakdown.skills?.matched);
}

function getMissingSkills(analysis?: CandidateResumeAnalysis): string[] {
  const breakdown = scoreBreakdown(analysis);
  const rootMissed = toStringArray(breakdown.missedSkills);
  if (rootMissed.length > 0) return rootMissed;
  return toStringArray(breakdown.skills?.missed);
}

function getSkillMetric(analysis?: CandidateResumeAnalysis): { label: string; configured: boolean } {
  const skills = scoreBreakdown(analysis).skills;
  const awarded = toNumber(skills?.awarded);
  const max = toNumber(skills?.max);
  if (!max || max <= 0 || awarded === null) return { label: 'Not configured', configured: false };
  return { label: `${((awarded / max) * 100).toFixed(2)}%`, configured: true };
}

function analysisStatusClass(status: string): string {
  if (status === 'COMPLETED') return 'bg-success-bg text-success-text';
  if (status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'UNSUPPORTED') return 'bg-neutral-50 text-neutral-500';
  return 'bg-info-bg text-info-text';
}

function isWorking(analysis?: CandidateResumeAnalysis): boolean {
  return analysis?.status === 'PENDING' || analysis?.status === 'PROCESSING' || analysis?.status === 'TEXT_EXTRACTED';
}

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: ReactNode;
  readonly icon: LucideIcon;
}) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-neutral-100 py-3 last:border-b-0">
      <Icon className="mt-0.5 size-4 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <div className="mt-0.5 truncate text-sm font-medium text-neutral-900">{value}</div>
      </div>
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
  readonly icon: LucideIcon;
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

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly tone: 'info' | 'success' | 'warning';
  readonly icon: LucideIcon;
}) {
  const toneClass = {
    info: 'bg-info-bg text-info-text',
    success: 'bg-success-bg text-success-text',
    warning: 'bg-warning-bg text-warning-text',
  }[tone];

  return (
    <div className={cn('rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
        <Icon className="size-4" />
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SectionPanel({
  title,
  icon: Icon,
  children,
}: {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h2 className="text-[17px] font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ResumeSections({
  title,
  icon,
  sections,
}: {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly sections: ResumeProfileSection[];
}) {
  if (sections.length === 0) return null;

  return (
    <SectionPanel title={title} icon={icon}>
      <div className="space-y-5">
        {sections.map((section, index) => (
          <div key={`${section.title}-${index}`} className="space-y-2">
            <p className="text-sm font-semibold text-neutral-900">{section.title}</p>
            <ul className="ml-4 list-disc space-y-1.5 text-sm leading-6 text-neutral-700 marker:text-primary">
              {section.bullets.map((bullet, bulletIndex) => (
                <li key={`${section.title}-${bulletIndex}`}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}

function BulletPanel({
  title,
  icon,
  bullets,
}: {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly bullets: string[];
}) {
  if (bullets.length === 0) return null;

  return (
    <SectionPanel title={title} icon={icon}>
      <ul className="ml-4 list-disc space-y-1.5 text-sm leading-6 text-neutral-700 marker:text-primary">
        {bullets.map((bullet, index) => (
          <li key={`${bullet}-${index}`}>{bullet}</li>
        ))}
      </ul>
    </SectionPanel>
  );
}

function EmptyProfileSections() {
  return (
    <section className="rounded-2xl bg-surface px-6 py-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <FileText className="mx-auto size-8 text-neutral-300" />
      <p className="mt-3 text-sm font-medium text-neutral-900">Resume sections are not available yet</p>
      <p className="mt-1 text-xs text-neutral-500">
        Re-analyze this resume to populate professional experience, projects, education, and achievements.
      </p>
    </section>
  );
}

function SkillFitSection({ analysis }: { readonly analysis?: CandidateResumeAnalysis }) {
  const matchedSkills = getMatchedSkills(analysis);
  const missingSkills = getMissingSkills(analysis);
  const extractedSkills = analysis?.extractedFacts?.skills ?? [];
  const matchedAnchors = new Set(
    matchedSkills
      .map((skill) => String(skill.normalizedSkill ?? '').trim())
      .filter(Boolean),
  );
  const unmatchedExtracted = extractedSkills.filter((skill) => {
    const anchor = skill.normalizedSkill?.trim();
    return !anchor || !matchedAnchors.has(anchor);
  });

  return (
    <SectionPanel title="Skill Fit" icon={Wrench}>
      <div className="grid gap-6 divide-neutral-100 md:grid-cols-3 md:gap-0 md:divide-x">
        <div className="md:pr-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-success-text">
            <CheckCircle2 className="size-4" />
            Matching skills
          </p>
          {matchedSkills.length > 0 ? (
            <ul className="ml-4 list-disc space-y-2 text-sm leading-6 text-neutral-700 marker:text-success-text">
              {matchedSkills.map((skill, index) => {
                const confidence = toNumber(skill.confidence);
                return (
                  <li key={`${formatUnknown(skill.normalizedSkill)}-${index}`}>
                    {formatUnknown(skill.normalizedSkill ?? skill.skill)}
                    {confidence !== null && confidence < 0.75 ? ' (partial)' : ''}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No matching required skills were reported.</p>
          )}
        </div>

        <div className="md:px-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive-text">
            <XCircle className="size-4" />
            Missing skills
          </p>
          {missingSkills.length > 0 ? (
            <ul className="ml-4 list-disc space-y-2 text-sm leading-6 text-neutral-700 marker:text-destructive-text">
              {missingSkills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No missing required skills were reported.</p>
          )}
        </div>

        <div className="md:pl-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <AlertTriangle className="size-4" />
            Skills not aligned with this job
          </p>
          {unmatchedExtracted.length > 0 ? (
            <ul className="ml-4 list-disc space-y-2 text-sm leading-6 text-neutral-700 marker:text-neutral-400">
              {unmatchedExtracted.map((skill, index) => (
                <li key={`${skill.skill}-${index}`}>{skill.skill}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No non-aligned candidate skills were extracted.</p>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}

function AnalysisNotice({
  analysis,
  error,
  onRetry,
  retrying,
}: {
  readonly analysis?: CandidateResumeAnalysis;
  readonly error: Error | null;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}) {
  if (!analysis) {
    return (
      <section className="rounded-2xl bg-surface p-5 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <Gauge className="mx-auto size-8 text-neutral-300" />
        <p className="mt-3 text-sm font-medium text-neutral-900">No ATS analysis yet</p>
        <p className="mt-1 text-xs text-neutral-500">
          {error ? 'Analysis was not found for this application.' : 'The candidate remains visible while analysis runs.'}
        </p>
      </section>
    );
  }

  const working = isWorking(analysis);
  const failed = analysis.status === 'FAILED';

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', analysisStatusClass(analysis.status))}>
              {working ? 'Analyzing' : analysis.status}
            </span>
            {analysis.evaluationStatus ? (
              <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {analysis.evaluationStatus}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {working
              ? 'Resume analysis is queued or running in the background.'
              : failed
                ? analysis.lastError ?? 'Resume analysis failed.'
                : 'AI facts and deterministic score are stored with this application.'}
          </p>
        </div>
        {!working ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
            {retrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            {failed ? 'Retry' : 'Re-analyze'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function parseFirewallItem(item: unknown): {
  page?: number | null;
  text?: string | null;
  type?: string | null;
  details?: string | null;
  severity?: string | null;
} {
  if (!item) return {};
  if (typeof item === 'string') {
    try {
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { text: item };
    }
  }
  if (typeof item === 'object') {
    return item as Record<string, unknown>;
  }
  return { text: String(item) };
}

function RiskSections({ analysis }: { readonly analysis?: CandidateResumeAnalysis }) {
  if (!analysis) return null;
  const facts = analysis.extractedFacts;
  const firewallItems = [...(analysis.firewallFlags ?? []), ...(analysis.removedSuspiciousText ?? [])];

  return (
    <div className="space-y-4">
      {analysis.isFlaggedForCheating ? (
        <section className="rounded-xl border border-warning-border bg-warning-bg p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning-text" />
            <div className="min-w-0 w-full">
              <p className="text-sm font-semibold text-warning-text">Suspicious hidden resume text found</p>
              <p className="mt-1 text-sm text-warning-text/90">
                These snippets were removed before sending resume text to AI. This is a warning, not an automatic rejection.
              </p>
              <div className="mt-3 space-y-2">
                {firewallItems.slice(0, 6).map((rawItem, index) => {
                  const item = parseFirewallItem(rawItem);
                  const displayType = item.type === 'white_text' ? 'White Text' : (item.type ?? 'Flagged Text');
                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-warning-border/50 bg-surface p-3 text-sm text-neutral-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-semibold text-neutral-900 break-all">
                          {item.details ?? (item.text ? `"${item.text}"` : 'Suspicious item')}
                        </span>
                        {item.severity ? (
                          <span className="rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning-text uppercase tracking-wider shrink-0 border border-warning-border/30">
                            {item.severity}
                          </span>
                        ) : null}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                        {item.page ? (
                          <span className="rounded bg-neutral-50 px-2 py-0.5 font-medium border border-neutral-100">
                            Page {item.page}
                          </span>
                        ) : null}
                        {displayType ? (
                          <span className="rounded bg-neutral-50 px-2 py-0.5 font-medium border border-neutral-100">
                            {displayType}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {facts?.explicitKnockoutRule ? (
        <section className="rounded-2xl bg-surface p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
                {facts.explicitKnockoutAssessment.evidence} / {confidenceLabel(facts.explicitKnockoutAssessment.confidence)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-warning-text">This rule could not be assessed automatically.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function CandidateMergedProfile({
  detail,
  analysis,
  isAnalysisLoading,
  analysisError,
  onRetryAnalysis,
  retryingAnalysis,
  orgSlug,
  memberId,
}: {
  readonly detail: CandidateApplicationDetail;
  readonly analysis?: CandidateResumeAnalysis;
  readonly isAnalysisLoading: boolean;
  readonly analysisError: Error | null;
  readonly onRetryAnalysis: () => void;
  readonly retryingAnalysis: boolean;
  readonly orgSlug?: string;
  readonly memberId?: string;
}) {
  const facts = analysis?.extractedFacts;
  const skillMetric = getSkillMetric(analysis);
  const matchedSkills = getMatchedSkills(analysis);
  const missingSkills = getMissingSkills(analysis);
  const professionalExperience = facts?.professionalExperience ?? [];
  const projects = facts?.projects ?? [];
  const achievements = facts?.achievements ?? [];
  const educationDetails = facts?.educationDetails ?? [];
  const certificationDetails = facts?.certificationDetails ?? [];
  const additionalSections = facts?.additionalSections ?? [];
  const hasResumeSections =
    professionalExperience.length > 0 ||
    projects.length > 0 ||
    achievements.length > 0 ||
    educationDetails.length > 0 ||
    certificationDetails.length > 0 ||
    additionalSections.length > 0;
  const recommendation =
    facts?.recommendationSummary?.trim() ||
    facts?.targetRoleAlignment?.evidence ||
    (!analysis
      ? 'No AI recommendation is available yet. The candidate profile remains visible while analysis is created.'
      : analysis.evaluationStatus === 'QUALIFIED'
      ? 'The AI analysis marks this candidate as qualified for recruiter review.'
      : analysis.evaluationStatus === 'REJECTED'
        ? 'The AI analysis found one or more blocking issues for this application.'
        : 'The AI analysis requires recruiter review before a hiring recommendation is made.');

  if (isAnalysisLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Skill Match" value={skillMetric.label} tone="info" icon={Gauge} />
        <MetricCard label="Matching Skills" value={matchedSkills.length} tone="success" icon={CheckCircle2} />
        <MetricCard label="Missing Skills" value={missingSkills.length} tone="warning" icon={AlertTriangle} />
      </div>

      <section className="rounded-2xl bg-surface p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-[17px] font-semibold text-neutral-900">AI recommendation</h2>
          </div>
          <Badge variant={statusTone(analysis?.evaluationStatus ?? detail.status)} className="text-xs">
            {analysis?.evaluationStatus ?? detail.status}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{recommendation}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {hasResumeSections ? (
            <>
              <ResumeSections title="Professional Experience" icon={BriefcaseBusiness} sections={professionalExperience} />
              <SkillFitSection analysis={analysis} />
              <ResumeSections title="Projects" icon={FileText} sections={projects} />
              <BulletPanel title="Achievements" icon={Medal} bullets={achievements} />
              <ResumeSections title="Education" icon={GraduationCap} sections={educationDetails} />
              <BulletPanel title="Certifications" icon={CheckCircle2} bullets={certificationDetails} />
              {additionalSections.map((section, index) => (
                <ResumeSections key={`${section.title}-${index}`} title={section.title} icon={FileText} sections={[section]} />
              ))}
            </>
          ) : (
            <>
              <EmptyProfileSections />
              <SkillFitSection analysis={analysis} />
            </>
          )}
          <AnalysisNotice
            analysis={analysis}
            error={analysisError}
            onRetry={onRetryAnalysis}
            retrying={retryingAnalysis}
          />
          <RiskSections analysis={analysis} />
        </div>

        <aside className="space-y-5">
          <SectionPanel title="Profile Details" icon={UserRound}>
            <div className="rounded-2xl bg-surface px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <ProfileField label="Email" icon={Mail} value={detail.candidate.email} />
              <ProfileField label="Phone" icon={Phone} value={detail.candidate.phone ?? 'Not provided'} />
              <ProfileField label="Applied" icon={CalendarClock} value={formatDateTime(detail.appliedAt)} />
              <ProfileField label="Current stage" icon={MapPin} value={detail.currentStage} />
            </div>
            <div className="mt-4 rounded-2xl bg-surface px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileDown className="size-4 shrink-0 text-neutral-400" />
                  <span className="truncate text-sm font-medium text-neutral-900">Resume</span>
                </div>
                {detail.resumeUrl ? (
                  <Button asChild size="sm" variant="ghost" className="h-8 shrink-0 px-2 text-primary">
                    <a href={detail.resumeUrl} target="_blank" rel="noreferrer">
                      Open
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-neutral-500">Not uploaded</span>
                )}
              </div>
              <LinkRow label="LinkedIn" href={detail.candidate.linkedinUrl} icon={LinkIcon} />
              <LinkRow label="Portfolio" href={detail.candidate.portfolioUrl} icon={FileText} />
            </div>
          </SectionPanel>

          {orgSlug && memberId ? (
            <OfferLettersPanel orgSlug={orgSlug} memberId={memberId} applicationId={detail.id} />
          ) : null}

        </aside>
      </div>
    </div>
  );
}
