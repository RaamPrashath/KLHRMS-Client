'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  EXPERIENCE_LEVELS,
  HIRING_REASONS,
  PRIORITIES,
  type OrgMemberOption,
} from '@/modules/jobs/types/jobRequisitionTypes';
import { RequiredMark, SectionCard } from '@/modules/jobs/components/sections/SectionCard';

interface HiringContextSectionProps {
  form: UseFormReturn<CreateJobRequisitionInput>;
  orgMembers: OrgMemberOption[];
}

function formatHiringReason(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatExperienceLevel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function HiringContextSection({
  form,
  orgMembers,
}: Readonly<HiringContextSectionProps>) {
  const hiringReason = useWatch({ control: form.control, name: 'hiringReason' });
  const priority = useWatch({ control: form.control, name: 'priority' });
  const skills = useWatch({ control: form.control, name: 'skills' }) ?? [];
  const certifications = useWatch({ control: form.control, name: 'certifications' }) ?? [];
  const experienceLevel = useWatch({ control: form.control, name: 'experienceLevel' });
  const { errors } = form.formState;
  const [skillInput, setSkillInput] = useState('');
  const [certificationInput, setCertificationInput] = useState('');

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      form.setValue('skills', [...skills, trimmed], { shouldDirty: true });
    }
    setSkillInput('');
  };

  const addCertification = () => {
    const trimmed = certificationInput.trim();
    if (trimmed && !certifications.includes(trimmed)) {
      form.setValue('certifications', [...certifications, trimmed], { shouldDirty: true });
    }
    setCertificationInput('');
  };

  return (
    <SectionCard id="hiring-context" title="Hiring context" required>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Hiring reason <RequiredMark /></Label>
          <Select
            value={hiringReason ?? ''}
            onValueChange={(value) =>
              form.setValue('hiringReason', value as CreateJobRequisitionInput['hiringReason'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full" aria-required="true" aria-invalid={!!errors.hiringReason}>
              <SelectValue placeholder="Why is this role needed?" />
            </SelectTrigger>
            <SelectContent>
              {HIRING_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {formatHiringReason(reason)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.hiringReason ? <p className="text-xs text-destructive-text">{errors.hiringReason.message}</p> : null}
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
                  {formatHiringReason(currentPriority)}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="skill-input">Skills</Label>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-ghost px-3 py-1 text-xs font-medium text-primary"
              >
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => form.setValue('skills', skills.filter((item) => item !== skill), { shouldDirty: true })}
                  className="rounded-full text-primary hover:text-neutral-900"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <Input
          id="skill-input"
          value={skillInput}
          onChange={(event) => setSkillInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder="Type a skill and press Enter"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Experience level</Label>
          <Select
            value={experienceLevel ?? ''}
            onValueChange={(value) =>
              form.setValue('experienceLevel', value as CreateJobRequisitionInput['experienceLevel'], { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {formatExperienceLevel(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-experience">Min experience (years)</Label>
          <Input
            id="min-experience"
            type="number"
            min={0}
            {...form.register('minExperience', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="education">Education</Label>
        <Input
          id="education"
          {...form.register('education')}
          placeholder="Bachelor's in Computer Science or equivalent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="certification-input">Certifications</Label>
        {certifications.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {certifications.map((certification) => (
              <span
                key={certification}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700"
              >
                {certification}
                <button
                  type="button"
                  aria-label={`Remove ${certification}`}
                  onClick={() =>
                    form.setValue('certifications', certifications.filter((item) => item !== certification), { shouldDirty: true })
                  }
                  className="rounded-full text-neutral-400 hover:text-neutral-900"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input
            id="certification-input"
            value={certificationInput}
            onChange={(event) => setCertificationInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCertification();
              }
            }}
            placeholder="Type a certification and press Enter"
          />
          <Button type="button" variant="outline" onClick={addCertification}>
            Add
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
