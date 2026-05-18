'use client';

import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/modules/jobs/components/RichTextEditor';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';

interface PostingContentSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
}

export function PostingContentSection({
  form,
}: Readonly<PostingContentSectionProps>) {
  const roleSummary = useWatch({ control: form.control, name: 'roleSummary' });
  const responsibilities = useWatch({ control: form.control, name: 'responsibilities' });
  const requirementsRich = useWatch({ control: form.control, name: 'requirementsRich' });
  const benefits = useWatch({ control: form.control, name: 'benefits' });
  const aboutTeam = useWatch({ control: form.control, name: 'aboutTeam' });

  return (
    <SectionCard title="Job Posting Content" description="Draft the public-facing copy once, then reuse it after approval.">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label>Role summary</Label>
          <RichTextEditor
            content={roleSummary ?? ''}
            onChange={(html) => form.setValue('roleSummary', html, { shouldDirty: true })}
            placeholder="Brief overview of the role..."
            minHeight={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Responsibilities</Label>
          <RichTextEditor
            content={responsibilities ?? ''}
            onChange={(html) => form.setValue('responsibilities', html, { shouldDirty: true })}
            placeholder="Key responsibilities and day-to-day work..."
            minHeight={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Requirements</Label>
          <RichTextEditor
            content={requirementsRich ?? ''}
            onChange={(html) => form.setValue('requirementsRich', html, { shouldDirty: true })}
            placeholder="Required qualifications and experience..."
            minHeight={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Benefits</Label>
          <RichTextEditor
            content={benefits ?? ''}
            onChange={(html) => form.setValue('benefits', html, { shouldDirty: true })}
            placeholder="Compensation, perks, and benefits..."
            minHeight={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label>About team</Label>
          <RichTextEditor
            content={aboutTeam ?? ''}
            onChange={(html) => form.setValue('aboutTeam', html, { shouldDirty: true })}
            placeholder="Describe the team culture and collaboration style..."
            minHeight={100}
          />
        </div>
      </div>
    </SectionCard>
  );
}
