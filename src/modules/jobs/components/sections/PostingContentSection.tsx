'use client';

import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/modules/jobs/components/RichTextEditor';
import { SectionCard } from '@/modules/jobs/components/sections/SectionCard';
import type { CreateJobRequisitionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';

interface PostingContentSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
  readOnly?: boolean;
}

const EDITOR_FIELDS = [
  {
    key: 'roleSummary',
    label: 'Role summary',
    placeholder: 'Brief overview of the role...',
    minHeight: 100,
  },
  {
    key: 'responsibilities',
    label: 'Responsibilities',
    placeholder: 'Key responsibilities and day-to-day work...',
    minHeight: 120,
  },
  {
    key: 'requirementsRich',
    label: 'Requirements',
    placeholder: 'Required qualifications and experience...',
    minHeight: 120,
  },
  {
    key: 'benefits',
    label: 'Benefits',
    placeholder: 'Compensation, perks, and benefits...',
    minHeight: 100,
  },
  {
    key: 'aboutTeam',
    label: 'About team',
    placeholder: 'Describe the team culture and collaboration style...',
    minHeight: 100,
  },
] as const;

export function PostingContentSection({
  form,
  readOnly,
}: Readonly<PostingContentSectionProps>) {
  const allValues = useWatch({ control: form.control }) as Record<string, string>;
  const contentError = form.formState.errors.roleSummary?.message;

  return (
    <SectionCard id="job-posting-content" title="Job posting content" required>
      {contentError ? <p className="text-xs text-destructive-text">{contentError}</p> : null}
      <div className="space-y-5">
        {EDITOR_FIELDS.map((field) => {
          const content = allValues[field.key] ?? '';
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <RichTextEditor
                content={content}
                onChange={(html) =>
                  form.setValue(field.key as keyof CreateJobRequisitionInput, html as never, { shouldDirty: true })
                }
                placeholder={field.placeholder}
                minHeight={field.minHeight}
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
