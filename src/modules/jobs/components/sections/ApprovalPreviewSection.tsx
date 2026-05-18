'use client';

import { CheckCircle2 } from 'lucide-react';

import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';

interface ApprovalPreviewSectionProps {
  step?: number;
  complete?: boolean;
  status?: string;
}

export function ApprovalPreviewSection({
  step,
  complete,
  status = 'Draft',
}: Readonly<ApprovalPreviewSectionProps>) {
  return (
    <SectionCard title="Approval Preview">
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-100 bg-surface-subtle p-4">
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-xs font-medium text-info-text">
              {status}
            </span>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            When you submit this requisition, approval requests will be sent to members with organization-level job approval permission. You can track the approval status on the requisition detail page after submission.
          </p>
        </div>

        <div className="rounded-lg border border-primary/10 bg-primary-ghost p-4">
          <p className="text-xs font-medium text-primary">After final approval</p>
          <ul className="mt-2 space-y-2">
            {[
              'A public job posting is created from the content above.',
              'Default hiring pipeline stages are prepared in ATS.',
              'Candidate applications can start flowing in.',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                <CheckCircle2 className="size-3.5 text-success-text shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
