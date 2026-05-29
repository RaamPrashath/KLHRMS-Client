'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OfferPreviewPane } from '@/modules/offers/components/OfferPreviewPane';
import { OfferSendConfirmDialog } from '@/modules/offers/components/OfferSendConfirmDialog';
import { OfferTemplatePicker } from '@/modules/offers/components/OfferTemplatePicker';
import {
  useCreateOfferDispatch,
  useValidateOfferDispatch,
} from '@/modules/offers/hooks/useOfferWorkspace';
import {
  useDeleteOfferTemplate,
  useOfferTemplate,
  useOfferTemplates,
} from '@/modules/offers/hooks/useOfferTemplates';
import type {
  OfferCandidateValidationResponse,
  OfferStageWorkspace,
  OfferTemplate,
  OfferTemplateListItem,
  OfferWorkspaceCandidate,
} from '@/modules/offers/types/offerTypes';

interface SendOfferDialogProps {
  readonly open: boolean;
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
  readonly workspace: OfferStageWorkspace;
  readonly selectedCandidates: OfferWorkspaceCandidate[];
  readonly selectedTemplateId: string | null;
  readonly selectedCategoryId: string | null;
  readonly expiryDays: number;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectedTemplateChange: (templateId: string | null) => void;
  readonly onSelectedCategoryChange: (categoryId: string | null) => void;
  readonly onExpiryDaysChange: (days: number) => void;
  readonly onDispatched: () => void;
}

interface DeleteTemplateTarget {
  id: string;
  name: string;
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function expiryDateFromDays(days: number): Date {
  const normalizedDays = Number.isFinite(days) && days > 0 ? days : 10;
  return new Date(Date.now() + normalizedDays * 24 * 60 * 60 * 1000);
}

function formatExpiry(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(value);
}

function templateAsDeleteTarget(template: OfferTemplate): DeleteTemplateTarget {
  return { id: template.id, name: template.name };
}

export function SendOfferDialog({
  open,
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
  workspace,
  selectedCandidates,
  selectedTemplateId,
  selectedCategoryId,
  expiryDays,
  onOpenChange,
  onSelectedTemplateChange,
  onSelectedCategoryChange,
  onExpiryDaysChange,
  onDispatched,
}: SendOfferDialogProps) {
  const [templateSearch, setTemplateSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<OfferCandidateValidationResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTemplateTarget | null>(null);

  const templatesQuery = useOfferTemplates(orgSlug, memberId, templateSearch);
  const selectedTemplateQuery = useOfferTemplate(orgSlug, memberId, selectedTemplateId);
  const deleteTemplate = useDeleteOfferTemplate(orgSlug, memberId);
  const validateDispatch = useValidateOfferDispatch(orgSlug, memberId, jobSlug, stageSlug);
  const createDispatch = useCreateOfferDispatch(orgSlug, memberId, jobSlug, stageSlug);

  const templates = templatesQuery.data ?? workspace.templates;
  const recentTemplate = workspace.recentTemplate;
  const selectedTemplate = selectedTemplateQuery.data ?? null;
  const expiryDate = useMemo(() => expiryDateFromDays(expiryDays), [expiryDays]);
  const expiryLabel = formatExpiry(expiryDate);

  useEffect(() => {
    if (!open || selectedTemplateId || templates.length === 0) return;
    onSelectedTemplateChange(recentTemplate?.id ?? templates[0]?.id ?? null);
  }, [open, onSelectedTemplateChange, recentTemplate?.id, selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const firstCategoryId = selectedTemplate.categories[0]?.id ?? null;
    const hasSelectedCategory = selectedTemplate.categories.some((category) => category.id === selectedCategoryId);
    if (!hasSelectedCategory) onSelectedCategoryChange(firstCategoryId);
  }, [onSelectedCategoryChange, selectedCategoryId, selectedTemplate]);

  const canSend = selectedCandidates.length > 0 && Boolean(selectedTemplateId && selectedCategoryId);

  async function openValidationConfirm() {
    if (!selectedTemplateId || !selectedCategoryId) {
      toast.error('Select a template and category first');
      return;
    }
    if (selectedCandidates.length === 0) {
      toast.error('Select at least one valid candidate');
      return;
    }

    try {
      const validation = await validateDispatch.mutateAsync({
        templateId: selectedTemplateId,
        categoryId: selectedCategoryId,
        applicationIds: selectedCandidates.map((candidate) => candidate.applicationId),
        expiresAt: expiryDate.toISOString(),
      });
      setValidationResult(validation);
      if (validation.validCandidates.length === 0) {
        toast.error('No selected candidates can receive offers');
        return;
      }
      setConfirmOpen(true);
      if (validation.blockedCandidates.length > 0) {
        toast.warning(`${validation.blockedCandidates.length} blocked candidate${validation.blockedCandidates.length === 1 ? '' : 's'} will be skipped`);
      }
    } catch (error) {
      toast.error(readActionError(error, 'Failed to validate selected candidates'));
    }
  }

  async function confirmDispatch() {
    if (!selectedTemplateId || !selectedCategoryId) return;
    try {
      const result = await createDispatch.mutateAsync({
        templateId: selectedTemplateId,
        categoryId: selectedCategoryId,
        applicationIds: selectedCandidates.map((candidate) => candidate.applicationId),
        expiresAt: expiryDate.toISOString(),
      });
      setConfirmOpen(false);
      onOpenChange(false);
      onDispatched();
      const queued = result.queuedOfferLetters.length;
      toast.success(`${queued} offer${queued === 1 ? '' : 's'} queued`);
      if (result.blockedCandidates.length > 0) {
        toast.warning(`${result.blockedCandidates.length} candidate${result.blockedCandidates.length === 1 ? '' : 's'} skipped`);
      }
    } catch (error) {
      toast.error(readActionError(error, 'Failed to create offer dispatch'));
    }
  }

  async function confirmDeleteTemplate() {
    if (!deleteTarget) return;
    try {
      await deleteTemplate.mutateAsync({ templateId: deleteTarget.id });
      if (selectedTemplateId === deleteTarget.id) {
        onSelectedTemplateChange(null);
        onSelectedCategoryChange(null);
      }
      setDeleteTarget(null);
      toast.success('Template deleted');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to delete template'));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[80dvh] w-[80vw] !max-w-[80vw] flex-col gap-0 overflow-hidden rounded-2xl bg-surface p-0 shadow-[var(--shadow-4)]">
          <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 py-5">
            <DialogTitle className="text-xl font-semibold text-neutral-900">Send offer letter</DialogTitle>
            <DialogDescription>
              Choose a template, review the letter content, and configure offer expiry.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-neutral-100 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] md:divide-x md:divide-y-0">
            <OfferTemplatePicker
              orgSlug={orgSlug}
              memberId={memberId}
              templates={templates}
              recentTemplate={recentTemplate}
              selectedTemplateId={selectedTemplateId}
              search={templateSearch}
              loading={templatesQuery.isLoading}
              onSearchChange={setTemplateSearch}
              onSelectTemplate={onSelectedTemplateChange}
              onDeleteTemplate={(template: OfferTemplateListItem) => setDeleteTarget(template)}
            />
            <OfferPreviewPane
              orgSlug={orgSlug}
              template={selectedTemplate}
              loading={selectedTemplateQuery.isLoading}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={onSelectedCategoryChange}
              onDeleteTemplate={(template) => setDeleteTarget(templateAsDeleteTarget(template))}
            />
          </div>

          <DialogFooter className="shrink-0 border-t border-neutral-100 px-6 py-4 sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 text-xs text-neutral-500 lg:flex-row lg:items-center lg:gap-5">
              <span className="font-medium text-neutral-700">
                {selectedCandidates.length} candidate{selectedCandidates.length === 1 ? '' : 's'} selected
              </span>
              <label className="flex flex-wrap items-center gap-2">
                <CalendarClock className="size-4 text-neutral-400" />
                <span className="whitespace-nowrap">Offer expires in</span>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={expiryDays}
                  onChange={(event) => onExpiryDaysChange(Math.max(1, Number(event.target.value) || 1))}
                  className="h-8 w-20 bg-surface text-sm"
                  aria-label="Offer expires in days"
                />
                <span className="whitespace-nowrap">days</span>
              </label>
              <span className="whitespace-nowrap font-mono text-xs text-neutral-500">{expiryLabel}</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={validateDispatch.isPending || createDispatch.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary-hover"
                disabled={!canSend || validateDispatch.isPending}
                onClick={() => void openValidationConfirm()}
              >
                {validateDispatch.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Send
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OfferSendConfirmDialog
        open={confirmOpen}
        validation={validationResult}
        expiryLabel={expiryLabel}
        sending={createDispatch.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmDispatch()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(nextOpen) => {
        if (!nextOpen) setDeleteTarget(null);
      }}>
        <AlertDialogContent className="rounded-2xl bg-surface shadow-[var(--shadow-4)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be removed if it is not referenced by an in-progress batch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTemplate.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTemplate.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteTemplate();
              }}
            >
              {deleteTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
