'use client';

import {
  CalendarClock,
  Users,
  UserCheck,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFetchHiringTeams,
  usePipelineBoardByJobSlug,
  usePipelineJobPostings,
} from '@/modules/candidates/hooks/useAtsPipeline';
import type {
  HiringTeamMember,
  PipelineApplication,
  PipelineStage,
} from '@/modules/candidates/types/atsTypes';

const DAY_MS = 24 * 60 * 60 * 1000;
const OVERLOAD_THRESHOLD = 5;

function candidateName(application: PipelineApplication): string {
  return `${application.candidate.firstName} ${application.candidate.lastName}`.trim();
}

function isWithinLastDays(value: string, days: number, nowMs: number): boolean {
  return nowMs - new Date(value).getTime() <= days * DAY_MS;
}

function isSameIstDay(left: Date, right: Date): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  });
  return formatter.format(left) === formatter.format(right);
}

function formatIstTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatActivityTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function isStageNamed(stage: PipelineStage, token: string): boolean {
  return stage.name.toLowerCase().includes(token);
}

function isHiredStage(stage: PipelineStage): boolean {
  return stage.stageType === 'HIRED' || isStageNamed(stage, 'accepted') || isStageNamed(stage, 'hired');
}

function isRejectedStage(stage: PipelineStage): boolean {
  return stage.stageType === 'REJECTED' || isStageNamed(stage, 'reject');
}

function isInterviewStage(stage: PipelineStage): boolean {
  return stage.stageType === 'INTERVIEW' || stage.meetingEnabled || isStageNamed(stage, 'interview');
}

function flattenStages(stages: PipelineStage[]) {
  return stages.flatMap((stage) =>
    stage.applications.map((application) => ({
      application,
      stage,
    })),
  );
}

function OverviewCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly helper: string;
  readonly icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-neutral-500">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-neutral-900">{value}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-ghost text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 truncate text-xs text-neutral-500">{helper}</p>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  readonly title: string;
  readonly eyebrow?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
      <div className="border-b border-neutral-100 px-5 py-4">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{eyebrow}</p> : null}
        <h2 className="text-[17px] font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyPanelMessage({ children }: { readonly children: React.ReactNode }) {
  return <div className="rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">{children}</div>;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[130px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}

export function AtsJobOverviewDashboard({
  orgSlug,
  memberId,
  jobSlug,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
}) {
  const [nowMs] = useState(() => Date.now());
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const boardQuery = usePipelineBoardByJobSlug(orgSlug, memberId, jobSlug);
  const currentPosting = postingsQuery.data?.find((posting) => posting.slug === jobSlug) ?? null;
  const hiringTeamsQuery = useFetchHiringTeams(orgSlug, memberId, currentPosting?.id ?? boardQuery.data?.jobPostingId ?? null);

  const dashboard = useMemo(() => {
    const stages = [...(boardQuery.data?.stages ?? [])].sort((left, right) => left.order - right.order);
    const stageApplications = flattenStages(stages);
    const applications = stageApplications.map((item) => item.application);
    const totalCandidates = applications.length;
    const hired = stageApplications.filter(({ stage }) => isHiredStage(stage)).length;
    const rejected = stageApplications.filter(({ stage }) => isRejectedStage(stage)).length;
    const ongoingInterviews = stageApplications.filter(
      ({ application, stage }) =>
        isInterviewStage(stage) &&
        application.interviewMeeting &&
        application.interviewMeeting.status === 'ONGOING',
    ).length;
    const interviewsThisWeek = stageApplications.filter(
      ({ application, stage }) =>
        isInterviewStage(stage) &&
        application.interviewMeeting &&
        isWithinLastDays(application.interviewMeeting.scheduledStartAt, 7, nowMs),
    ).length;

    const upcomingInterviews = stageApplications
      .filter(({ application }) => {
        const meeting = application.interviewMeeting;
        return meeting && new Date(meeting.scheduledStartAt).getTime() >= nowMs && meeting.status !== 'COMPLETED';
      })
      .sort(
        (left, right) =>
          new Date(left.application.interviewMeeting?.scheduledStartAt ?? 0).getTime() -
          new Date(right.application.interviewMeeting?.scheduledStartAt ?? 0).getTime(),
      )
      .slice(0, 5);

    const today = new Date(nowMs);
    const interviewerCounts = new Map<string, { assigned: number; today: number }>();
    for (const { application } of stageApplications) {
      const meeting = application.interviewMeeting;
      const interviewer = meeting?.interviewerName?.trim();
      if (!meeting || !interviewer || meeting.status === 'COMPLETED') continue;
      const current = interviewerCounts.get(interviewer.toLowerCase()) ?? { assigned: 0, today: 0 };
      current.assigned += 1;
      if (isSameIstDay(new Date(meeting.scheduledStartAt), today)) current.today += 1;
      interviewerCounts.set(interviewer.toLowerCase(), current);
    }

    const teamMembers = (hiringTeamsQuery.data?.items ?? []).flatMap((team) => team.members);
    const uniqueTeamMembers = new Map<string, HiringTeamMember>();
    for (const member of teamMembers) {
      uniqueTeamMembers.set(member.memberId, member);
    }
    const hiringLoad = Array.from(uniqueTeamMembers.values())
      .map((member) => {
        const lookupKeys = [member.name, member.email].filter(Boolean).map((value) => value?.toLowerCase() ?? '');
        const counts = lookupKeys.reduce(
          (found, key) => found ?? interviewerCounts.get(key),
          undefined as { assigned: number; today: number } | undefined,
        ) ?? { assigned: 0, today: 0 };
        return { member, ...counts };
      })
      .sort((left, right) => right.today - left.today || right.assigned - left.assigned)
      .slice(0, 6);

    const recentActivity = stageApplications.flatMap(({ application, stage }) => {
      const items = [
        {
          id: `${application.id}-stage`,
          label: application.lastMovedAt
            ? `${candidateName(application)} moved to ${stage.name}`
            : `${candidateName(application)} applied`,
          time: application.lastMovedAt ?? application.appliedDate,
        },
      ];
      if (application.interviewMeeting?.status === 'COMPLETED') {
        items.push({
          id: `${application.id}-completed`,
          label: `${candidateName(application)} completed interview with ${application.interviewMeeting.interviewerName ?? 'interviewer'}`,
          time: application.interviewMeeting.completedAt ?? application.interviewMeeting.scheduledEndAt,
        });
      }
      return items;
    })
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 6);

    return {
      hired,
      hiringLoad,
      interviewsThisWeek,
      ongoingInterviews,
      recentActivity,
      rejected,
      totalCandidates,
      upcomingInterviews,
    };
  }, [boardQuery.data?.stages, hiringTeamsQuery.data?.items, nowMs]);

  if (boardQuery.isLoading || postingsQuery.isLoading) {
    return <OverviewSkeleton />;
  }

  if (boardQuery.isError) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">
        This job posting was not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard label="Total Candidates" value={dashboard.totalCandidates} helper="All active applications" icon={Users} />
        <OverviewCard
          label="Interviews"
          value={`${dashboard.interviewsThisWeek}/${dashboard.ongoingInterviews}`}
          helper="This week / ongoing"
          icon={CalendarClock}
        />
        <OverviewCard label="Offer Accepted" value={dashboard.hired} helper="Candidates moved to accepted" icon={UserRoundCheck} />
        <OverviewCard label="Offer Rejected" value={dashboard.rejected} helper="Candidates closed as rejected" icon={XCircle} />
      </div>

      <div className="grid gap-5 grid-cols-2">
        <Panel title="Upcoming Interviews" eyebrow="Next scheduled">
          {dashboard.upcomingInterviews.length === 0 ? (
            <EmptyPanelMessage>No upcoming interviews scheduled for this job.</EmptyPanelMessage>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="py-2 pr-4">Candidate</th>
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Interviewer</th>
                    <th className="py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {dashboard.upcomingInterviews.map(({ application, stage }) => (
                    <tr key={application.id} className="text-sm text-neutral-700">
                      <td className="py-3 pr-4 font-medium text-neutral-900">{candidateName(application)}</td>
                      <td className="py-3 pr-4">{stage.name}</td>
                      <td className="py-3 pr-4">{application.interviewMeeting?.interviewerName ?? 'Unassigned'}</td>
                      <td className="py-3 text-right font-mono text-[13px] text-neutral-900">
                        {application.interviewMeeting ? formatIstTime(application.interviewMeeting.scheduledStartAt) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Hiring Team Load" eyebrow="Interview capacity">
          {dashboard.hiringLoad.length === 0 ? (
            <EmptyPanelMessage>No hiring team has been attached to this opening yet.</EmptyPanelMessage>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="py-2 pr-4">Interviewer</th>
                    <th className="py-2 pr-4 text-right">Assigned</th>
                    <th className="py-2 pr-4 text-right">Today</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {dashboard.hiringLoad.map(({ member, assigned, today }) => {
                    const overloaded = today > OVERLOAD_THRESHOLD;
                    return (
                      <tr key={member.id} className="text-sm text-neutral-700">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-neutral-900">{member.name ?? member.email ?? 'Team member'}</div>
                          <div className="text-xs text-neutral-500">{member.role ?? 'Interviewer'}</div>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[13px] text-neutral-900">{assigned}</td>
                        <td className="py-3 pr-4 text-right font-mono text-[13px] text-neutral-900">{today}</td>
                        <td className="py-3 text-right">
                          <Badge
                            variant="outline"
                            className={
                              overloaded
                                ? 'border-warning-border bg-warning-bg text-warning-text'
                                : 'border-success-border bg-success-bg text-success-text'
                            }
                          >
                            {overloaded ? 'Heavy load' : 'Available'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent Activity" eyebrow="Latest movement">
        {dashboard.recentActivity.length === 0 ? (
          <EmptyPanelMessage>No candidate activity yet.</EmptyPanelMessage>
        ) : (
          <div className="divide-y divide-neutral-100">
            {dashboard.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-ghost text-primary">
                    <UserCheck className="size-4" />
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-900">{activity.label}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-neutral-500">{formatActivityTime(activity.time)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
