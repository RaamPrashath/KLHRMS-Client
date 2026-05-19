'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useImportOptionsQuery } from '@/modules/jobs/hooks/usePipelineMutations';
import {
  createPipelineStageSchema,
  type CreatePipelineStageInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';
import {
  PIPELINE_STAGE_TYPES,
  type PipelineStageRecord,
} from '@/modules/jobs/types/jobRequisitionTypes';

type SetupSelection = 'new' | 'default' | 'import';

interface PipelineSetupDialogProps {
  open: boolean;
  initialSelection: SetupSelection;
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  creatingStage: boolean;
  creatingDefault: boolean;
  importingJobId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateStage: (values: CreatePipelineStageInput) => void;
  onCreateDefault: () => void;
  onImport: (sourceJobPostingId: string) => void;
}

interface StagePreview {
  id: string;
  name: string;
  stageType: PipelineStageRecord['stageType'];
  meetingEnabled: boolean;
  offerLetterEnabled: boolean;
  evaluationEnabled: boolean;
  evaluationType: PipelineStageRecord['evaluationType'];
  evaluationIncludeTotal: boolean;
  evaluationIncludeAnalysis: boolean;
  dueDate: string | null;
  extendToNextWorkingDay: boolean;
  isDefault: boolean;
  isFinal: boolean;
  evaluationCategories: PipelineStageRecord['evaluationCategories'];
}

const STAGE_TYPE_LABELS: Record<(typeof PIPELINE_STAGE_TYPES)[number], string> = {
  DEFAULT: 'Default',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

const DEFAULT_STAGE_PREVIEWS: StagePreview[] = [
  {
    id: 'default-screening',
    name: 'Screening',
    stageType: 'DEFAULT',
    meetingEnabled: false,
    offerLetterEnabled: false,
    evaluationEnabled: false,
    evaluationType: null,
    evaluationIncludeTotal: false,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    isDefault: true,
    isFinal: false,
    evaluationCategories: [],
  },
  {
    id: 'default-interview',
    name: 'Interview',
    stageType: 'INTERVIEW',
    meetingEnabled: true,
    offerLetterEnabled: false,
    evaluationEnabled: false,
    evaluationType: null,
    evaluationIncludeTotal: false,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    isDefault: true,
    isFinal: false,
    evaluationCategories: [],
  },
  {
    id: 'default-offer',
    name: 'Offer',
    stageType: 'OFFER',
    meetingEnabled: false,
    offerLetterEnabled: true,
    evaluationEnabled: false,
    evaluationType: null,
    evaluationIncludeTotal: false,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    isDefault: true,
    isFinal: false,
    evaluationCategories: [],
  },
  {
    id: 'default-hired',
    name: 'Hired',
    stageType: 'HIRED',
    meetingEnabled: false,
    offerLetterEnabled: false,
    evaluationEnabled: false,
    evaluationType: null,
    evaluationIncludeTotal: false,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    isDefault: true,
    isFinal: true,
    evaluationCategories: [],
  },
  {
    id: 'default-rejected',
    name: 'Rejected',
    stageType: 'REJECTED',
    meetingEnabled: false,
    offerLetterEnabled: false,
    evaluationEnabled: false,
    evaluationType: null,
    evaluationIncludeTotal: false,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    isDefault: true,
    isFinal: true,
    evaluationCategories: [],
  },
];

function newStageDefaults(): CreatePipelineStageInput {
  return {
    name: '',
    stageType: 'DEFAULT',
    evaluationEnabled: false,
    evaluationType: 'NUMERIC',
    evaluationIncludeTotal: true,
    evaluationIncludeAnalysis: false,
    dueDate: null,
    extendToNextWorkingDay: false,
    evaluationCategories: [],
  };
}

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00+05:30`).toISOString();
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return 'Due date';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function ConfigPill({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
      {children}
    </span>
  );
}

function StageConfigTable({
  stages,
  emptyMessage,
}: Readonly<{
  stages: StagePreview[];
  emptyMessage: string;
}>) {
  if (stages.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-canvas">
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-100 bg-surface">
      <Table>
        <TableHeader className="bg-canvas">
          <TableRow>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Column
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Type
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Evaluation
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Capabilities
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Due date
            </TableHead>
            <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Config
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.map((stage) => (
            <TableRow key={stage.id} className="hover:bg-canvas">
              <TableCell className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{stage.name}</p>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-neutral-700">
                {STAGE_TYPE_LABELS[stage.stageType]}
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <ConfigPill>{formatBoolean(stage.evaluationEnabled)}</ConfigPill>
                  {stage.evaluationEnabled ? (
                    <>
                      <ConfigPill>{stage.evaluationType ?? 'Numeric'}</ConfigPill>
                      <ConfigPill>{stage.evaluationCategories.length} fields</ConfigPill>
                    </>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {stage.meetingEnabled ? <ConfigPill>Meeting</ConfigPill> : null}
                  {stage.offerLetterEnabled ? <ConfigPill>Offer letter</ConfigPill> : null}
                  {!stage.meetingEnabled && !stage.offerLetterEnabled ? <ConfigPill>None</ConfigPill> : null}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-neutral-700">
                {stage.dueDate ? formatDateLabel(stage.dueDate) : 'Not set'}
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {stage.isDefault ? <ConfigPill>Default</ConfigPill> : null}
                  {stage.isFinal ? <ConfigPill>Final</ConfigPill> : null}
                  {stage.extendToNextWorkingDay ? <ConfigPill>Extends</ConfigPill> : null}
                  {!stage.isDefault && !stage.isFinal && !stage.extendToNextWorkingDay ? (
                    <ConfigPill>Standard</ConfigPill>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function NewColumnForm({
  submitting,
  onSubmit,
}: Readonly<{
  submitting: boolean;
  onSubmit: (values: CreatePipelineStageInput) => void;
}>) {
  const form = useForm<CreatePipelineStageInput>({
    resolver: zodResolver(createPipelineStageSchema),
    defaultValues: newStageDefaults(),
  });
  const stageType = useWatch({ control: form.control, name: 'stageType' });
  const dueDate = useWatch({ control: form.control, name: 'dueDate' });
  const evaluationEnabled = useWatch({ control: form.control, name: 'evaluationEnabled' });
  const evaluationType = useWatch({ control: form.control, name: 'evaluationType' });
  const evaluationIncludeTotal = useWatch({ control: form.control, name: 'evaluationIncludeTotal' });
  const evaluationIncludeAnalysis = useWatch({ control: form.control, name: 'evaluationIncludeAnalysis' });
  const calendarDate = dueDate ? new Date(`${toDateInputValue(dueDate)}T12:00:00+05:30`) : undefined;
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'evaluationCategories',
  });

  return (
    <form
      id="pipeline-new-column-form"
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => {
        const nextValues =
          values.stageType === 'INTERVIEW'
            ? values
            : {
                ...values,
                evaluationEnabled: false,
                evaluationCategories: [],
              };
        onSubmit(nextValues);
      })}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-neutral-700">Stage name</span>
          <Input
            placeholder="Screening"
            disabled={submitting}
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <span className="mt-1 block text-xs text-destructive-text">
              {form.formState.errors.name.message}
            </span>
          ) : null}
        </label>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-neutral-700">Due date</span>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-10 flex-1 justify-start bg-surface text-left font-normal">
                  <CalendarDays className="size-4" />
                  {formatDateLabel(dueDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={(date) => {
                    form.setValue('dueDate', date ? fromDateInputValue(date.toISOString().slice(0, 10)) : null, {
                      shouldDirty: true,
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
            {dueDate ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-10"
                aria-label="Clear due date"
                onClick={() => form.setValue('dueDate', null)}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[13px] font-medium text-neutral-700">Stage type</span>
        <RadioGroup
          value={stageType}
          onValueChange={(value) =>
            form.setValue('stageType', value as CreatePipelineStageInput['stageType'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          className="grid grid-cols-2 gap-2 xl:grid-cols-5"
        >
          {PIPELINE_STAGE_TYPES.map((type) => (
            <label
              key={type}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-100 bg-surface px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-ghost has-[[data-state=checked]]:text-primary"
            >
              <RadioGroupItem value={type} disabled={submitting} />
              {STAGE_TYPE_LABELS[type]}
            </label>
          ))}
        </RadioGroup>
      </div>

      {stageType === 'INTERVIEW' ? (
        <section className="space-y-4 rounded-xl border border-neutral-100 bg-canvas p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Evaluation configuration</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Configure the feedback fields interviewers fill before completing this stage.
              </p>
            </div>
            <Switch
              checked={Boolean(evaluationEnabled)}
              disabled={submitting}
              onCheckedChange={(checked) => {
                form.setValue('evaluationEnabled', checked);
                if (checked && !form.getValues('evaluationType')) {
                  form.setValue('evaluationType', 'NUMERIC');
                }
              }}
            />
          </div>

          {evaluationEnabled ? (
            <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-neutral-700">Evaluation type</span>
                  <Select
                    value={evaluationType ?? 'NUMERIC'}
                    onValueChange={(value) =>
                      form.setValue('evaluationType', value as CreatePipelineStageInput['evaluationType'])
                    }
                  >
                    <SelectTrigger className="bg-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUMERIC">Numeric</SelectItem>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface px-3 py-2">
                  <span className="text-sm text-neutral-700">Include total</span>
                  <Switch
                    checked={Boolean(evaluationIncludeTotal)}
                    disabled={evaluationType !== 'NUMERIC'}
                    onCheckedChange={(checked) => form.setValue('evaluationIncludeTotal', checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-surface px-3 py-2">
                  <span className="text-sm text-neutral-700">Include analysis</span>
                  <Switch
                    checked={Boolean(evaluationIncludeAnalysis)}
                    onCheckedChange={(checked) => form.setValue('evaluationIncludeAnalysis', checked)}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-neutral-700">Subcategories</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => append({ name: '', type: 'NUMERIC', order: fields.length + 1 })}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[minmax(0,1fr)_130px_32px_32px_32px] items-center gap-2"
                    >
                      <Input
                        {...form.register(`evaluationCategories.${index}.name`)}
                        placeholder="Category name"
                        className="h-9"
                      />
                      <Select
                        defaultValue={field.type ?? 'NUMERIC'}
                        onValueChange={(value) =>
                          form.setValue(
                            `evaluationCategories.${index}.type`,
                            value as 'NUMERIC' | 'TEXT' | 'CHECKBOX',
                          )
                        }
                      >
                        <SelectTrigger className="h-9 bg-surface">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NUMERIC">Numeric</SelectItem>
                          <SelectItem value="TEXT">Text</SelectItem>
                          <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label="Move category up"
                        onClick={() => move(index, index - 1)}
                      >
                        <ChevronsUpDown className="size-4 rotate-90" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === fields.length - 1}
                        aria-label="Move category down"
                        onClick={() => move(index, index + 1)}
                      >
                        <ChevronsUpDown className="size-4 -rotate-90" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete category"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive-text" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 bg-surface p-3 text-xs text-neutral-500">
                      No evaluation subcategories yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}

export function PipelineSetupDialog({
  open,
  initialSelection,
  orgSlug,
  memberId,
  requisitionId,
  creatingStage,
  creatingDefault,
  importingJobId,
  onOpenChange,
  onCreateStage,
  onCreateDefault,
  onImport,
}: Readonly<PipelineSetupDialogProps>) {
  const [manualSelection, setManualSelection] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const importOptionsQuery = useImportOptionsQuery(orgSlug, memberId, requisitionId);

  const filteredJobs = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const options = importOptionsQuery.data ?? [];
    if (!query) return options;
    return options.filter((option) =>
      [option.title, option.departmentName].filter(Boolean).join(' ').toLowerCase().includes(query),
    );
  }, [deferredSearch, importOptionsQuery.data]);

  const requestedSelection = manualSelection ?? initialSelection;
  const selection =
    requestedSelection === 'import' && importOptionsQuery.data?.[0]
      ? `job:${importOptionsQuery.data[0].id}`
      : requestedSelection;

  const selectedJob = useMemo(() => {
    if (!selection.startsWith('job:')) return null;
    const jobId = selection.slice(4);
    return importOptionsQuery.data?.find((job) => job.id === jobId) ?? null;
  }, [importOptionsQuery.data, selection]);

  const contentTitle =
    selection === 'new'
      ? 'New column'
      : selection === 'default'
        ? 'Set default columns'
        : selectedJob?.title ?? 'Import from existing job';

  const busy = creatingStage || creatingDefault || importingJobId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] w-[80vw] max-w-[80vw] gap-0 overflow-hidden bg-surface p-0 sm:max-w-[80vw] max-sm:h-[92vh] max-sm:w-[calc(100vw-1rem)] max-sm:max-w-[calc(100vw-1rem)]">
        <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[30%_70%]">
          <aside className="flex min-h-0 flex-col border-b border-neutral-100 bg-canvas md:border-b-0 md:border-r">
            <div className="border-b border-neutral-100 p-4">
              <DialogHeader className="gap-1">
                <DialogTitle className="text-[17px] font-semibold text-neutral-900">Pipeline setup</DialogTitle>
              </DialogHeader>
            </div>

            <div className="space-y-2 border-b border-neutral-100 p-3">
              <Button
                type="button"
                variant={selection === 'new' ? 'default' : 'ghost'}
                className={cn('w-full justify-start', selection !== 'new' && 'text-neutral-700')}
                onClick={() => setManualSelection('new')}
              >
                <Plus className="size-4" />
                New Column
              </Button>
              <Button
                type="button"
                variant={selection === 'default' ? 'default' : 'ghost'}
                className={cn('w-full justify-start', selection !== 'default' && 'text-neutral-700')}
                onClick={() => setManualSelection('default')}
              >
                <Settings2 className="size-4" />
                Set default columns
              </Button>
            </div>

            <div className="border-b border-neutral-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search jobs"
                  className="bg-neutral-50 pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {importOptionsQuery.isLoading ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : null}

              {!importOptionsQuery.isLoading && filteredJobs.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm font-medium text-neutral-700">No jobs found</p>
                  <p className="mt-1 text-xs text-neutral-500">Create a new column or use defaults.</p>
                </div>
              ) : null}

              {!importOptionsQuery.isLoading
                ? filteredJobs.map((job) => {
                    const isSelected = selection === `job:${job.id}`;
                    const isImporting = importingJobId === job.id;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        className={cn(
                          'mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          isSelected
                            ? 'bg-primary-ghost text-primary'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
                        )}
                        onClick={() => setManualSelection(`job:${job.id}`)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{job.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {job.departmentName ?? 'No department'} - {job.stageCount} stages
                          </span>
                        </span>
                        {isImporting ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
                        {isSelected && !isImporting ? <Check className="size-4 shrink-0" /> : null}
                      </button>
                    );
                  })
                : null}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-surface">
            <div className="flex items-start justify-between gap-4  px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{contentTitle}</h2>
              </div>

              {selection === 'new' ? (
                <Button type="submit" form="pipeline-new-column-form" disabled={creatingStage}>
                  {creatingStage ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save stage
                </Button>
              ) : null}

              {selection === 'default' ? (
                <Button type="button" disabled={creatingDefault || busy} onClick={onCreateDefault}>
                  {creatingDefault ? <Loader2 className="size-4 animate-spin" /> : null}
                  Use default pipeline
                </Button>
              ) : null}

              {selectedJob ? (
                <Button
                  type="button"
                  disabled={selectedJob.stageCount === 0 || busy}
                  onClick={() => onImport(selectedJob.id)}
                >
                  {importingJobId === selectedJob.id ? <Loader2 className="size-4 animate-spin" /> : null}
                  Import pipeline
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-surface p-5">
              {selection === 'new' ? (
                <NewColumnForm submitting={creatingStage} onSubmit={onCreateStage} />
              ) : null}

              {selection === 'default' ? (
                <StageConfigTable stages={DEFAULT_STAGE_PREVIEWS} emptyMessage="No default stages configured." />
              ) : null}

              {selection !== 'new' && selection !== 'default' ? (
                <StageConfigTable
                  stages={(selectedJob?.stages ?? []) as StagePreview[]}
                  emptyMessage={
                    selectedJob
                      ? 'This job has no importable stages.'
                      : 'Select a job from the sidebar to preview its columns.'
                  }
                />
              ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
