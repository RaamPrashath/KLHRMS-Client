'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { JobRequisitionDecisionInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import {
  EMPLOYMENT_TYPES,
  type JobDepartmentOption,
  type JobRequisitionRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';
import {
  formatInrSalary,
  parseAnnualSalaryInput,
} from '@/modules/jobs/utils/salaryParser';

interface ApprovalDialogProps {
  open: boolean;
  mode: 'approve' | 'reject';
  requisition: JobRequisitionRecord | null;
  loading: boolean;
  departments: JobDepartmentOption[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: JobRequisitionDecisionInput) => Promise<void>;
}

interface ApprovalFormState {
  title: string;
  departmentId: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  openings: number;
  salaryMin: string;
  salaryMax: string;
  location: string;
  isRemote: boolean;
  skillsText: string;
}

function buildInitialState(requisition: JobRequisitionRecord | null): ApprovalFormState {
  return {
    title: requisition?.title ?? '',
    departmentId: requisition?.departmentId ?? '',
    employmentType: requisition?.employmentType ?? 'FULL_TIME',
    openings: requisition?.openings ?? 1,
    salaryMin: formatInrSalary(requisition?.salaryMin),
    salaryMax: formatInrSalary(requisition?.salaryMax),
    location: requisition?.location ?? '',
    isRemote: requisition?.isRemote ?? false,
    skillsText: requisition?.skills.join(', ') ?? '',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return fallback;
}

export function ApprovalDialog({
  open,
  mode,
  requisition,
  loading,
  departments,
  onOpenChange,
  onConfirm,
}: Readonly<ApprovalDialogProps>) {
  const [comment, setComment] = useState('');
  const [form, setForm] = useState<ApprovalFormState>(() => buildInitialState(requisition));
  const [formError, setFormError] = useState<string | null>(null);
  const isApprove = mode === 'approve';

  function updateForm<K extends keyof ApprovalFormState>(key: K, value: ApprovalFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleConfirm() {
    if (!requisition) return;

    try {
      if (isApprove) {
        const salaryMin = parseAnnualSalaryInput(form.salaryMin);
        const salaryMax = parseAnnualSalaryInput(form.salaryMax);
        if (salaryMin == null) {
          setFormError('Annual salary is required. Try 4.5 l, 8 lakhs, or 1 crore.');
          return;
        }
        if (form.salaryMax.trim() && salaryMax == null) {
          setFormError('Maximum salary must be a valid amount.');
          return;
        }
        if (salaryMax != null && salaryMax < salaryMin) {
          setFormError('Maximum salary must be greater than or equal to annual salary.');
          return;
        }
        await onConfirm({
          comment: comment.trim() || null,
          salaryMin,
          salaryMax,
          currency: requisition.currency,
          title: form.title.trim(),
          departmentId: form.departmentId || null,
          employmentType: form.employmentType,
          openings: form.openings,
          location: form.location.trim() || null,
          isRemote: form.isRemote,
          skills: form.skillsText
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
        });
        return;
      }

      if (!comment.trim()) {
        setFormError('Comment is required when rejecting.');
        return;
      }
      await onConfirm({ comment: comment.trim() });
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${mode} requisition`));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {isApprove ? 'Approve Requisition' : 'Reject Requisition'}
          </DialogTitle>
          <DialogDescription>
            Review the request summary before recording your decision.
          </DialogDescription>
        </DialogHeader>

        {requisition ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-900">{requisition.title}</p>
            <div className="mt-2 grid gap-2 text-xs text-neutral-500 sm:grid-cols-3">
              <span className="font-mono">{requisition.requisitionLabel ?? requisition.id}</span>
              <span>{requisition.departmentName ?? 'No department'}</span>
              <span>{requisition.priority}</span>
            </div>
          </div>
        ) : null}

        {isApprove ? (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-title">Job title</Label>
                <Input
                  id="approval-title"
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={(value) => updateForm('departmentId', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Employment type</Label>
                <Select
                  value={form.employmentType}
                  onValueChange={(value) => updateForm('employmentType', value as ApprovalFormState['employmentType'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full time</SelectItem>
                    <SelectItem value="PART_TIME">Part time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-openings">Openings</Label>
                <Input
                  id="approval-openings"
                  type="number"
                  min={1}
                  value={form.openings}
                  onChange={(event) => updateForm('openings', Number(event.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-salary-min">Annual salary</Label>
                <Input
                  id="approval-salary-min"
                  placeholder="4.5 l"
                  value={form.salaryMin}
                  onChange={(event) => updateForm('salaryMin', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-salary-max">Annual salary max</Label>
                <Input
                  id="approval-salary-max"
                  placeholder="Optional range max"
                  value={form.salaryMax}
                  onChange={(event) => updateForm('salaryMax', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approval-location">Location</Label>
                <Input
                  id="approval-location"
                  value={form.location}
                  onChange={(event) => updateForm('location', event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                <div>
                  <Label htmlFor="approval-remote">Remote role</Label>
                  <p className="text-xs text-neutral-500">Mark as remote-friendly.</p>
                </div>
                <Switch
                  id="approval-remote"
                  checked={form.isRemote}
                  onCheckedChange={(checked) => updateForm('isRemote', checked)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="approval-skills">Skills</Label>
              <Input
                id="approval-skills"
                value={form.skillsText}
                onChange={(event) => updateForm('skillsText', event.target.value)}
                placeholder="React, TypeScript, Hiring"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approval-comment">
            {isApprove ? 'Comment' : 'Rejection comment'}
          </Label>
          <Textarea
            id="approval-comment"
            rows={4}
            placeholder={isApprove ? 'Optional comment' : 'Why is this requisition being rejected?'}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setFormError(null);
            }}
          />
        </div>

        {formError ? <p className="text-xs text-destructive-text">{formError}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (isApprove ? 'Approving...' : 'Rejecting...') : (isApprove ? 'Approve' : 'Reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
