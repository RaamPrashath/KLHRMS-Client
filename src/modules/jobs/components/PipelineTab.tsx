'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddStageDialog } from '@/modules/jobs/components/AddStageDialog';
import { DefaultPipelineConfirmDialog } from '@/modules/jobs/components/DefaultPipelineConfirmDialog';
import { ImportJobSelector } from '@/modules/jobs/components/ImportJobSelector';
import { PipelineBoard } from '@/modules/jobs/components/PipelineBoard';
import { PipelineColumn } from '@/modules/jobs/components/PipelineColumn';
import { PipelineSetupCard } from '@/modules/jobs/components/PipelineSetupCard';
import {
  useCreateDefaultPipeline,
  useCreatePipelineStage,
  useImportPipeline,
  usePipelineBoardQuery,
} from '@/modules/jobs/hooks/usePipelineMutations';
import type { CreatePipelineStageInput } from '@/modules/jobs/schema/jobRequisitionSchemas';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

interface PipelineTabProps {
  orgSlug: string;
  memberId: string;
  requisition: JobRequisitionRecord;
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {[1, 2, 3].map((column) => (
        <div key={column} className="w-[280px] shrink-0 rounded-xl border border-neutral-100 bg-surface p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-[120px] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function PipelineTab({ orgSlug, memberId, requisition }: Readonly<PipelineTabProps>) {
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [defaultConfirmOpen, setDefaultConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importingJobId, setImportingJobId] = useState<string | null>(null);

  const pipelineQuery = usePipelineBoardQuery(orgSlug, memberId, requisition.id);
  const createStage = useCreatePipelineStage(orgSlug, memberId, requisition.id);
  const createDefault = useCreateDefaultPipeline(orgSlug, memberId, requisition.id);
  const importPipeline = useImportPipeline(orgSlug, memberId, requisition.id);

  const stages = pipelineQuery.data?.stages ?? [];
  const onlyApplied =
    stages.length === 1 &&
    stages[0]?.name.trim().toLowerCase() === 'applied' &&
    stages[0]?.order === 1;

  async function handleCreateStage(values: CreatePipelineStageInput) {
    try {
      await createStage.mutateAsync(values);
      setAddStageOpen(false);
      toast.success('Pipeline stage created');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create pipeline stage'));
    }
  }

  async function handleCreateDefault() {
    try {
      await createDefault.mutateAsync();
      setDefaultConfirmOpen(false);
      toast.success('Default pipeline created');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create default pipeline'));
    }
  }

  async function handleImport(sourceJobPostingId: string) {
    try {
      setImportingJobId(sourceJobPostingId);
      await importPipeline.mutateAsync(sourceJobPostingId);
      setImportOpen(false);
      toast.success('Pipeline imported');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to import pipeline'));
    } finally {
      setImportingJobId(null);
    }
  }

  if (pipelineQuery.isLoading) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
        <PipelineSkeleton />
      </div>
    );
  }

  if (pipelineQuery.isError) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-bg p-4 text-destructive-text">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Pipeline could not be loaded</p>
            <p className="mt-1 text-sm">{readActionError(pipelineQuery.error, 'Try again in a moment.')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => pipelineQuery.refetch()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
        {onlyApplied ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <PipelineColumn stage={stages[0]} />
            <PipelineSetupCard
              creatingDefault={createDefault.isPending}
              importing={importPipeline.isPending}
              onAddStage={() => setAddStageOpen(true)}
              onUseDefault={() => setDefaultConfirmOpen(true)}
              onImport={() => setImportOpen(true)}
            />
          </div>
        ) : (
          <PipelineBoard stages={stages} onAddStage={() => setAddStageOpen(true)} />
        )}
      </div>

      <AddStageDialog
        open={addStageOpen}
        submitting={createStage.isPending}
        onOpenChange={setAddStageOpen}
        onSubmit={handleCreateStage}
      />
      <DefaultPipelineConfirmDialog
        open={defaultConfirmOpen}
        loading={createDefault.isPending}
        onOpenChange={setDefaultConfirmOpen}
        onConfirm={handleCreateDefault}
      />
      <ImportJobSelector
        open={importOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        requisitionId={requisition.id}
        importingJobId={importingJobId}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </>
  );
}
