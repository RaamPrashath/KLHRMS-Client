'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';

interface KnockoutRuleSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
}

export function KnockoutRuleSection({ form }: Readonly<KnockoutRuleSectionProps>) {
  return (
    <SectionCard id="knockout-rule" title="Knockout rule" hideHeaderBorder>
      <div className="flex flex-col gap-1.5">
        <Textarea
          id="knockout-rule-input"
          {...form.register('knockoutRule')}
          maxLength={2000}
          className="min-h-28 resize-y"
          placeholder="Leave blank for no knockout. Example: Candidate must hold an active security certification."
        />
      </div>
    </SectionCard>
  );
}
