'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineBoard } from '@/modules/jobs/components/PipelineBoard';
import { PipelineColumn } from '@/modules/jobs/components/PipelineColumn';
import { PipelineSetupCard } from '@/modules/jobs/components/PipelineSetupCard';
import { PipelineSetupDialog } from '@/modules/jobs/components/PipelineSetupDialog';
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
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupInitialSelection, setSetupInitialSelection] = useState<'new' | 'default' | 'import'>('new');
  const [importingJobId, setImportingJobId] = useState<string | null>(null);
  const autoOpenedSetupRef = useRef(false);

  const pipelineQuery = usePipelineBoardQuery(orgSlug, memberId, requisition.id);
  const createStage = useCreatePipelineStage(orgSlug, memberId, requisition.id);
  const createDefault = useCreateDefaultPipeline(orgSlug, memberId, requisition.id);
  const importPipeline = useImportPipeline(orgSlug, memberId, requisition.id);

  const stages = pipelineQuery.data?.stages ?? [];
  const onlyApplied =
    stages.length === 1 &&
    stages[0]?.name.trim().toLowerCase() === 'applied' &&
    stages[0]?.order === 1;

  useEffect(() => {
    if (!pipelineQuery.isSuccess || !onlyApplied || autoOpenedSetupRef.current) return;
    autoOpenedSetupRef.current = true;
    const timeout = window.setTimeout(() => {
      setSetupInitialSelection('new');
      setSetupOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [onlyApplied, pipelineQuery.isSuccess]);

  function openSetup(selection: 'new' | 'default' | 'import') {
    setSetupInitialSelection(selection);
    setSetupOpen(true);
  }

  async function handleCreateStage(values: CreatePipelineStageInput) {
    try {
      await createStage.mutateAsync(values);
      setSetupOpen(false);
      toast.success('Pipeline stage created');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create pipeline stage'));
    }
  }

  async function handleCreateDefault() {
    try {
      await createDefault.mutateAsync();
      setSetupOpen(false);
      toast.success('Default pipeline created');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create default pipeline'));
    }
  }

  async function handleImport(sourceJobPostingId: string) {
    try {
      setImportingJobId(sourceJobPostingId);
      await importPipeline.mutateAsync(sourceJobPostingId);
      setSetupOpen(false);
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
      <div className="rounded-xl border border-neutral-100 bg-canvas p-4 shadow-[var(--shadow-1)]">
        {onlyApplied ? (
          <div className="grid min-h-[calc(100vh-320px)] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <PipelineColumn stage={stages[0]} />
            <div className="flex min-h-[420px] items-center justify-center">
              <PipelineSetupCard
                creatingDefault={createDefault.isPending}
                importing={importPipeline.isPending}
                onAddStage={() => openSetup('new')}
                onUseDefault={() => openSetup('default')}
                onImport={() => openSetup('import')}
              />
            </div>
          </div>
        ) : (
          <PipelineBoard stages={stages} onAddStage={() => openSetup('new')} />
        )}
      </div>

      <PipelineSetupDialog
        key={`${setupInitialSelection}-${setupOpen ? 'open' : 'closed'}`}
        open={setupOpen}
        initialSelection={setupInitialSelection}
        orgSlug={orgSlug}
        memberId={memberId}
        requisitionId={requisition.id}
        creatingStage={createStage.isPending}
        creatingDefault={createDefault.isPending}
        importingJobId={importingJobId}
        onOpenChange={setSetupOpen}
        onCreateStage={handleCreateStage}
        onCreateDefault={handleCreateDefault}
        onImport={handleImport}
      />
    </>
  );
}
