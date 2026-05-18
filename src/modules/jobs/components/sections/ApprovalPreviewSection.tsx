'use client';

import { CheckCircle2, Clock } from 'lucide-react';

import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';

export function ApprovalPreviewSection() {
  return (
    <SectionCard title="Approval Preview" description="The approval chain is resolved from permission scopes at submission.">
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Clock className="size-4 text-warning-text" />
            Members with organization-level job approval permission will review this requisition.
          </div>
        </div>

        <div className="rounded-lg border border-primary/10 bg-primary-ghost p-4">
          <p className="text-xs font-medium text-primary">After final approval</p>
          <ul className="mt-2 space-y-2">
            {[
              'A public job posting is created.',
              'Default hiring pipeline stages are prepared.',
              'Candidate applications can start flowing into ATS.',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                <CheckCircle2 className="size-3.5 text-success-text" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
