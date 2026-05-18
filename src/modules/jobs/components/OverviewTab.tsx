'use client';

import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRequisitionStatusClasses } from '@/modules/jobs/components/RequisitionHeader';
import type {
  JobRequisitionApproval,
  JobRequisitionRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';
import { formatInrSalary } from '@/modules/jobs/utils/salaryParser';

interface OverviewTabProps {
  requisition: JobRequisitionRecord;
}

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}

interface RichContentProps {
  title: string;
  html: string | null;
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  return format(new Date(value), 'MMM d, yyyy');
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Not set';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function salaryLabel(requisition: JobRequisitionRecord) {
  if (requisition.salaryMin == null && requisition.salaryMax == null) return 'Not assigned';
  if (requisition.salaryMin != null && requisition.salaryMax != null) {
    return `${requisition.currency} ${formatInrSalary(requisition.salaryMin)} - ${formatInrSalary(requisition.salaryMax)}`;
  }
  if (requisition.salaryMin != null) return `${requisition.currency} ${formatInrSalary(requisition.salaryMin)}+`;
  return `${requisition.currency} up to ${formatInrSalary(requisition.salaryMax)}`;
}

function decisionLabel(approval: JobRequisitionApproval) {
  if (!approval.decidedAt) return 'Pending';
  return format(new Date(approval.decidedAt), 'MMM d, yyyy h:mm a');
}

function InfoItem({ label, value, mono }: Readonly<InfoItemProps>) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={cn('mt-1 text-sm text-neutral-900', mono && 'font-mono')}>
        {value ?? 'Not set'}
      </p>
    </div>
  );
}

function RichContent({ title, html }: Readonly<RichContentProps>) {
  if (!html) return null;
  return (
    <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
      <h2 className="text-[17px] font-semibold text-neutral-900">{title}</h2>
      <div
        className="mt-3 max-w-none text-sm leading-6 text-neutral-700 [&_a]:text-primary [&_a]:underline [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export function OverviewTab({ requisition }: Readonly<OverviewTabProps>) {
  const richRequirements = requisition.requirementsRich ?? requisition.requirements;
  const richSummary = requisition.roleSummary ?? requisition.description;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Department" value={requisition.departmentName ?? 'No department'} />
          <InfoItem label="Employment type" value={formatLabel(requisition.employmentType)} />
          <InfoItem label="Openings" value={requisition.openings} mono />
          <InfoItem label="Target date" value={formatDate(requisition.targetDate)} />
          <InfoItem label="Hiring reason" value={formatLabel(requisition.hiringReason)} />
          <InfoItem label="Priority" value={formatLabel(requisition.priority)} />
          <InfoItem label="Work mode" value={requisition.isRemote ? 'Remote' : (requisition.location ?? 'On-site')} />
          <InfoItem label="Annual salary" value={salaryLabel(requisition)} mono />
          <InfoItem label="Raised by" value={requisition.raisedByName ?? 'Unknown'} />
          {requisition.experienceLevel ? <InfoItem label="Experience level" value={formatLabel(requisition.experienceLevel)} /> : null}
          {requisition.minExperience != null ? <InfoItem label="Min experience" value={`${requisition.minExperience} years`} /> : null}
          {requisition.education ? <InfoItem label="Education" value={requisition.education} /> : null}
        </div>
      </section>

      {requisition.businessJustification ? (
        <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
          <h2 className="text-[17px] font-semibold text-neutral-900">Business Justification</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-700">{requisition.businessJustification}</p>
        </section>
      ) : null}

      {requisition.skills.length > 0 ? (
        <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
          <h2 className="text-[17px] font-semibold text-neutral-900">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {requisition.skills.map((skill) => (
              <Badge key={skill} className="bg-primary-ghost text-primary">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {requisition.certifications.length > 0 ? (
        <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
          <h2 className="text-[17px] font-semibold text-neutral-900">Certifications</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {requisition.certifications.map((certification) => (
              <Badge key={certification} className="border border-warning-border bg-warning-bg text-warning-text">
                {certification}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <RichContent title="Role Summary" html={richSummary} />
      <RichContent title="Responsibilities" html={requisition.responsibilities} />
      <RichContent title="Requirements" html={richRequirements} />
      <RichContent title="Benefits" html={requisition.benefits} />
      <RichContent title="About Team" html={requisition.aboutTeam} />

      <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
        <h2 className="text-[17px] font-semibold text-neutral-900">Approval Progress</h2>
        {requisition.approvals.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No approvals configured yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {requisition.approvals.map((approval) => (
              <div key={approval.id} className="flex items-start gap-3 rounded-lg border border-neutral-100 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700">
                  {(approval.approverName ?? approval.approverId).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900">{approval.approverName ?? approval.approverId}</p>
                    <Badge className={cn('border', getRequisitionStatusClasses(approval.decision))}>
                      {formatLabel(approval.decision)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{decisionLabel(approval)}</p>
                  {approval.comment ? (
                    <p className="mt-2 truncate text-sm text-neutral-700" title={approval.comment}>
                      {approval.comment}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
