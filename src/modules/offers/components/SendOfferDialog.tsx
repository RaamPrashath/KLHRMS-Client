'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { OfferSendConfirmDialog } from '@/modules/offers/components/OfferSendConfirmDialog';
import { OfferDownloadConfirmDialog } from '@/modules/offers/components/OfferDownloadConfirmDialog';
import { OfferPagedPreview } from '@/modules/offers/components/OfferPagedPreview';
import { OfferTemplatePicker } from '@/modules/offers/components/OfferTemplatePicker';
import type { OfferDownloadFormat } from '@/modules/offers/schema/offerSchemas';
import { composeTemplateHtml, type OfferTemplateRenderData } from '@/modules/offers/utils/offerTemplateRender';
import {
  useCreateOfferDispatch,
  useDownloadOfferLetters,
  useValidateOfferDispatch,
  useValidateOfferDownload,
} from '@/modules/offers/hooks/useOfferWorkspace';
import {
  useOfferTemplate,
  useOfferTemplates,
} from '@/modules/offers/hooks/useOfferTemplates';
import type {
  OfferCandidateValidationResponse,
  OfferStageWorkspace,
  OfferTemplateCategory,
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

function formatOfferGeneratedDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(value);
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
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<OfferCandidateValidationResponse | null>(null);
  const [downloadValidationResult, setDownloadValidationResult] = useState<OfferCandidateValidationResponse | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<OfferDownloadFormat | null>(null);
  const [confirmationGeneratedDate, setConfirmationGeneratedDate] = useState(() => formatOfferGeneratedDate(new Date()));
  const [candidateNameOverrides, setCandidateNameOverrides] = useState<Record<string, string>>({});
  const templatesQuery = useOfferTemplates(orgSlug, memberId, templateSearch);
  const selectedTemplateQuery = useOfferTemplate(orgSlug, memberId, selectedTemplateId);
  const validateDispatch = useValidateOfferDispatch(orgSlug, memberId, jobSlug, stageSlug);
  const validateDownload = useValidateOfferDownload(orgSlug, memberId, jobSlug, stageSlug);
  const createDispatch = useCreateOfferDispatch(orgSlug, memberId, jobSlug, stageSlug);
  const downloadOffers = useDownloadOfferLetters(orgSlug, memberId, jobSlug, stageSlug);

  const templates = templatesQuery.data ?? workspace.templates;
  const recentTemplate = workspace.recentTemplate;
  const selectedTemplate = selectedTemplateQuery.data ?? null;
  const expiryDate = useMemo(() => expiryDateFromDays(expiryDays), [expiryDays]);
  const expiryLabel = formatExpiry(expiryDate);

  const selectedCategory = useMemo<OfferTemplateCategory | null>(() => {
    if (!selectedTemplate || !selectedCategoryId) return null;
    return selectedTemplate.categories.find((cat) => cat.id === selectedCategoryId) ?? null;
  }, [selectedTemplate, selectedCategoryId]);

  const previewHtml = useMemo(() => {
    if (!selectedTemplate || !selectedCategory) return '';
    return composeTemplateHtml(selectedTemplate, selectedCategory);
  }, [selectedTemplate, selectedCategory]);
  const confirmationRenderData = useMemo<OfferTemplateRenderData>(() => ({
    firstName: '',
    lastName: '',
    generatedDate: confirmationGeneratedDate,
    salaryMin: workspace.jobCompensationPreview?.salaryMin ?? '',
    salaryMax: workspace.jobCompensationPreview?.salaryMax ?? '',
    currency: workspace.jobCompensationPreview?.currency ?? '',
  }), [
    confirmationGeneratedDate,
    workspace.jobCompensationPreview?.currency,
    workspace.jobCompensationPreview?.salaryMax,
    workspace.jobCompensationPreview?.salaryMin,
  ]);

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
  const isBusy = validateDispatch.isPending || createDispatch.isPending || validateDownload.isPending || downloadFormat !== null;

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
      setCandidateNameOverrides({});
      setConfirmationGeneratedDate(formatOfferGeneratedDate(new Date()));
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
        candidateNameOverrides: Object.entries(candidateNameOverrides).map(([applicationId, displayName]) => ({
          applicationId,
          displayName,
        })),
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

  async function openDownloadConfirm() {
    if (!selectedTemplateId || !selectedCategoryId) {
      toast.error('Select a template and category first');
      return;
    }
    if (selectedCandidates.length === 0) {
      toast.error('Select at least one candidate');
      return;
    }

    try {
      const validation = await validateDownload.mutateAsync({
        templateId: selectedTemplateId,
        categoryId: selectedCategoryId,
        applicationIds: selectedCandidates.map((candidate) => candidate.applicationId),
        expiresAt: expiryDate.toISOString(),
      });
      setDownloadValidationResult(validation);
      if (validation.validCandidates.length === 0) {
        toast.error('No selected candidates can be downloaded');
        return;
      }
      setDownloadConfirmOpen(true);
      if (validation.blockedCandidates.length > 0) {
        toast.warning(`${validation.blockedCandidates.length} blocked candidate${validation.blockedCandidates.length === 1 ? '' : 's'} will be skipped`);
      }
    } catch (error) {
      toast.error(readActionError(error, 'Failed to validate selected candidates for download'));
    }
  }

  async function confirmDownload(format: OfferDownloadFormat) {
    if (!selectedTemplateId || !selectedCategoryId) return;
    setDownloadFormat(format);
    try {
      const result = await downloadOffers.mutateAsync({
        templateId: selectedTemplateId,
        categoryId: selectedCategoryId,
        applicationIds: selectedCandidates.map((candidate) => candidate.applicationId),
        expiresAt: expiryDate.toISOString(),
        format,
      });
      downloadBase64File(result.base64, result.contentType, result.fileName);
      setDownloadConfirmOpen(false);
      onOpenChange(false);
      toast.success(`${format === 'pdf' ? 'PDF' : 'Word'} offer letters downloaded`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to download offer letters'));
    } finally {
      setDownloadFormat(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[80dvh] w-[80vw] !max-w-[80vw] flex-col gap-0 overflow-hidden rounded-2xl bg-surface p-0 shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 py-5">
            <DialogTitle className="text-xl font-semibold text-neutral-900">Send offer letter</DialogTitle>
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
              onReloadTemplates={() => templatesQuery.refetch()}
            />
            <div className="flex min-h-0 flex-col">
              {selectedTemplate && selectedTemplate.categories.length > 1 ? (
                <div className="shrink-0 border-b border-neutral-100 px-4 py-3">
                  <Select
                    value={selectedCategory?.id ?? ''}
                    onValueChange={onSelectedCategoryChange}
                  >
                    <SelectTrigger className="h-8 w-full text-xs bg-surface">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTemplate.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 bg-canvas">
                <OfferPagedPreview
                  html={previewHtml}
                  ariaLabel="Selected offer template preview"
                  emptyState={(
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      {selectedTemplate
                        ? 'Select a category to preview'
                        : 'Select a template to preview'}
                    </div>
                  )}
                />
              </div>
            </div>
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
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canSend || isBusy}
                onClick={() => void openDownloadConfirm()}
              >
                {validateDownload.isPending || downloadFormat !== null ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary-hover"
                disabled={!canSend || isBusy}
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
        sending={createDispatch.isPending}
        template={selectedTemplate}
        category={selectedCategory}
        renderData={confirmationRenderData}
        nameOverrides={candidateNameOverrides}
        onOpenChange={setConfirmOpen}
        onNameOverrideSave={(applicationId, displayName) => {
          setCandidateNameOverrides((current) => ({
            ...current,
            [applicationId]: displayName,
          }));
        }}
        onConfirm={() => void confirmDispatch()}
      />

      <OfferDownloadConfirmDialog
        open={downloadConfirmOpen}
        validation={downloadValidationResult}
        downloadingFormat={downloadFormat}
        onOpenChange={setDownloadConfirmOpen}
        onConfirm={(format) => void confirmDownload(format)}
      />

    </>
  );
}

function downloadBase64File(base64: string, contentType: string, fileName: string) {
  const byteCharacters = window.atob(base64);
  const byteArrays: ArrayBuffer[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    byteArrays.push(Uint8Array.from(slice, (char) => char.charCodeAt(0)).buffer as ArrayBuffer);
  }
  const blob = new Blob(byteArrays, { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
