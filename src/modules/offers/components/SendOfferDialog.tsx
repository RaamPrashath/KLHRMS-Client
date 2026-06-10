'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OfferSendConfirmDialog } from '@/modules/offers/components/OfferSendConfirmDialog';
import { OfferTemplatePicker } from '@/modules/offers/components/OfferTemplatePicker';
import { composeTemplateHtml } from '@/modules/offers/utils/offerTemplateRender';
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
  OfferTemplateCategory,
  OfferTemplateListItem,
  OfferWorkspaceCandidate,
} from '@/modules/offers/types/offerTypes';
import { cn } from '@/lib/utils';

/* ── Preview styling constants (mirrors OfferTemplatePreview) ── */
const PREVIEW_PAGE_W = 794;
const PREVIEW_PADDING_X = 76;
const PREVIEW_PADDING_Y = 90;
const PREVIEW_CONTENT_CLASSES = cn(
  'space-y-4 text-[15px] leading-[26px]',
  '[&_a]:text-primary [&_a]:underline',
  '[&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:leading-7 [&_h2]:text-neutral-900',
  '[&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:leading-6 [&_h3]:text-neutral-900',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2',
  '[&_.offer-letter-header]:relative [&_.offer-letter-header]:mb-8 [&_.offer-letter-header]:min-h-[116px]',
  '[&_.offer-letter-header-brand]:absolute [&_.offer-letter-header-brand]:left-[var(--offer-header-brand-left)] [&_.offer-letter-header-brand]:top-[var(--offer-header-brand-top)]',
  '[&_.offer-letter-logo]:max-h-14 [&_.offer-letter-logo]:max-w-44 [&_.offer-letter-logo]:object-contain',
  '[&_.offer-letter-header-meta]:absolute [&_.offer-letter-header-meta]:right-0 [&_.offer-letter-header-meta]:top-12 [&_.offer-letter-header-meta]:text-right [&_.offer-letter-header-meta]:text-[13px] [&_.offer-letter-header-meta]:leading-6',
  '[&_.offer-letter-header_h1]:absolute [&_.offer-letter-header_h1]:bottom-0 [&_.offer-letter-header_h1]:left-0 [&_.offer-letter-header_h1]:right-0 [&_.offer-letter-header_h1]:text-center [&_.offer-letter-header_h1]:whitespace-nowrap [&_.offer-letter-header_h1]:text-base [&_.offer-letter-header_h1]:font-semibold',
  '[&_footer]:mt-6 [&_footer]:pt-0 [&_footer]:text-[13px] [&_footer]:text-neutral-900',
  '[&_.offer-signature-slot]:mb-6 [&_.offer-signature-slot_img]:mb-2 [&_.offer-signature-slot_img]:max-h-20 [&_.offer-signature-slot_img]:max-w-32 [&_.offer-signature-slot_img]:object-contain',
  '[&_.offer-signature-name]:font-semibold [&_.offer-footer-address]:mt-7 [&_.offer-footer-address_p]:mb-0 [&_.offer-footer-address_p]:leading-5',
  '[&_.offer-footer-website]:float-right [&_.offer-footer-website]:-mt-[34px] [&_.offer-footer-website]:text-[17px] [&_.offer-footer-website]:font-bold [&_.offer-footer-website]:text-neutral-900 [&_.offer-footer-website]:no-underline',
);

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

  const selectedCategory = useMemo<OfferTemplateCategory | null>(() => {
    if (!selectedTemplate || !selectedCategoryId) return null;
    return selectedTemplate.categories.find((cat) => cat.id === selectedCategoryId) ?? null;
  }, [selectedTemplate, selectedCategoryId]);

  const previewHtml = useMemo(() => {
    if (!selectedTemplate || !selectedCategory) return '';
    return composeTemplateHtml(selectedTemplate, selectedCategory);
  }, [selectedTemplate, selectedCategory]);

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
              onDeleteTemplate={(template: OfferTemplateListItem) => setDeleteTarget(template)}
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
              <div className="min-h-0 flex-1 overflow-y-auto bg-canvas p-4">
                {previewHtml ? (
                  <div
                    className="mx-auto bg-surface relative shadow-md"
                    style={{
                      width: PREVIEW_PAGE_W,
                      paddingTop: 56,
                      paddingBottom: PREVIEW_PADDING_Y,
                      paddingLeft: PREVIEW_PADDING_X,
                      paddingRight: PREVIEW_PADDING_X,
                    }}
                  >
                    {/* Corner mark */}
                    <div className="absolute bg-primary" style={{ top: 28, left: 28, height: 68, width: 19 }} />
                    {/* Bottom bar */}
                    <div className="absolute flex items-end gap-1" style={{ bottom: 32, right: PREVIEW_PADDING_X }}>
                      <span className="block h-1.5 w-16 bg-neutral-900" />
                      <span className="block h-1.5 w-8 bg-primary" />
                    </div>
                    <div
                      className={PREVIEW_CONTENT_CLASSES}
                      style={{
                        '--offer-header-brand-left': '-9px',
                        '--offer-header-brand-top': '-22px',
                      } as React.CSSProperties}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                    {selectedTemplate
                      ? 'Select a category to preview'
                      : 'Select a template to preview'}
                  </div>
                )}
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
        sending={createDispatch.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmDispatch()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(nextOpen) => {
        if (!nextOpen) setDeleteTarget(null);
      }}>
        <AlertDialogContent className="rounded-2xl bg-surface shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
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
