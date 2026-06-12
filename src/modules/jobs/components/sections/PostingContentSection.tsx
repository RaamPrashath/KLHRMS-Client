'use client';

import { useWatch, type UseFormReturn } from 'react-hook-form';

import { RichTextEditor } from '@/modules/jobs/components/RichTextEditor';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';

interface PostingContentSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
  readOnly?: boolean;
}

export function PostingContentSection({
  form,
  readOnly,
}: Readonly<PostingContentSectionProps>) {
  const roleSummary = useWatch({ control: form.control, name: 'roleSummary' }) ?? '';
  const contentError = form.formState.errors.roleSummary?.message;

  return (
    <SectionCard id="job-posting-content" title="Job description">
      {contentError ? <p className="text-xs text-destructive-text">{contentError}</p> : null}
      <RichTextEditor
        content={roleSummary}
        onChange={(html) =>
          form.setValue('roleSummary', html, { shouldDirty: true })
        }
        placeholder="Write the job description..."
        minHeight={200}
        readOnly={readOnly}
      />
    </SectionCard>
  );
}
