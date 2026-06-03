'use client';

import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { JobRequisitionApproval } from '@/modules/jobs/types/jobRequisitionTypes';

interface StickySummaryPanelProps {
  sectionCompletion: Record<string, boolean>;
  approvals?: JobRequisitionApproval[];
  showApprovals?: boolean;
}

const SECTION_LABELS = [
  { key: 'basicInfo', label: 'Basic information', targetId: 'basic-information' },
  { key: 'hiringContext', label: 'Hiring context', targetId: 'hiring-context' },
  { key: 'compensation', label: 'Compensation', targetId: 'compensation' },
  { key: 'requirements', label: 'Requirements', targetId: 'candidate-requirements' },
  { key: 'postingContent', label: 'Posting content', targetId: 'job-posting-content' },
];

export function StickySummaryPanel({
  sectionCompletion,
  approvals = [],
  showApprovals,
}: Readonly<StickySummaryPanelProps>) {
  const completedCount = Object.values(sectionCompletion).filter(Boolean).length;
  const totalSections = SECTION_LABELS.length;
  const [activeSection, setActiveSection] = useState(SECTION_LABELS[0]?.targetId);
  const progress = Math.round((completedCount / totalSections) * 100);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        root: null,
        rootMargin: '-18% 0px -64% 0px',
        threshold: [0.12, 0.3, 0.55],
      },
    );

    SECTION_LABELS.forEach(({ targetId }) => {
      const section = document.getElementById(targetId);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-18 space-y-4">
        <div className="rounded-xl bg-surface-subtle p-4">
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Form contents
          </h3>
          <div className="mb-4 px-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/60">
              <div
                className="h-full rounded-lg bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            {SECTION_LABELS.map(({ key, label, targetId }) => {
              const done = sectionCompletion[key] ?? false;
              const active = activeSection === targetId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => scrollToSection(targetId)}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    active
                      ? 'bg-primary font-semibold text-white shadow-[var(--shadow-1)]'
                      : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900',
                  ].join(' ')}
                >
                  {done ? (
                    <CheckCircle2 className={active ? 'size-4 shrink-0 text-white' : 'size-4 shrink-0 text-primary'} />
                  ) : (
                    <Circle className={active ? 'size-4 shrink-0 text-white' : 'size-4 shrink-0 text-neutral-300'} />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 px-1 text-xs font-medium text-neutral-400">
            {completedCount}/{totalSections} sections complete
          </div>
        </div>

        {showApprovals ? <ApprovalsCard approvals={approvals} /> : null}
      </div>
    </aside>
  );
}

function ApprovalsCard({ approvals }: Readonly<{ approvals: JobRequisitionApproval[] }>) {
  const total = approvals.length;
  const approved = approvals.filter((approval) => approval.decision === 'APPROVED').length;

  return (
    <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Approvers
        </h3>
        {total > 0 ? (
          <span className="text-xs font-medium text-neutral-400">
            {approved}/{total}
          </span>
        ) : null}
      </div>

      {approvals.length === 0 ? (
        <p className="text-sm text-neutral-500">No approvers assigned yet.</p>
      ) : (
        <div className="space-y-2.5">
          {approvals.map((approval) => {
            const isApproved = approval.decision === 'APPROVED';
            const isRejected = approval.decision === 'REJECTED';
            const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock;

            return (
              <div key={approval.id} className="flex items-start gap-2.5">
                <Icon
                  className={[
                    'mt-0.5 size-4 shrink-0',
                    isApproved && 'text-success-text',
                    isRejected && 'text-destructive-text',
                    !isApproved && !isRejected && 'text-warning-text',
                  ].filter(Boolean).join(' ')}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {approval.approverName ?? approval.approverId}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDecision(approval.decision)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDecision(decision: JobRequisitionApproval['decision']) {
  return decision
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
