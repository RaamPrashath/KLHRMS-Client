'use client';

import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import {
  HIRING_REASONS,
  PRIORITIES,
  type OrgMemberOption,
} from '@/modules/jobs/types/jobRequisitionTypes';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';

interface HiringContextSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
  orgMembers: OrgMemberOption[];
}

function formatOption(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function HiringContextSection({
  form,
  orgMembers,
}: Readonly<HiringContextSectionProps>) {
  const hiringReason = useWatch({ control: form.control, name: 'hiringReason' });
  const priority = useWatch({ control: form.control, name: 'priority' });

  return (
    <SectionCard title="Hiring Context" description="Explain why this role is needed now.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Hiring reason</Label>
          <Select
            value={hiringReason ?? ''}
            onValueChange={(value) =>
              form.setValue('hiringReason', value as CreateJobRequisitionInput['hiringReason'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              {HIRING_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {formatOption(reason)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) =>
              form.setValue('priority', value as CreateJobRequisitionInput['priority'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((currentPriority) => (
                <SelectItem key={currentPriority} value={currentPriority}>
                  {formatOption(currentPriority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hiringReason === 'REPLACEMENT' ? (
        <div className="flex flex-col gap-1.5">
          <Label>Replacement for</Label>
          <Select
            value={form.getValues('replacementForId') ?? ''}
            onValueChange={(value) => form.setValue('replacementForId', value, { shouldDirty: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {orgMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-justification">Business justification</Label>
        <Textarea
          id="business-justification"
          rows={4}
          {...form.register('businessJustification')}
          placeholder="What outcome or capacity gap does this role solve?"
        />
      </div>
    </SectionCard>
  );
}
