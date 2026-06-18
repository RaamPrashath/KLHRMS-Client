'use client';

import { useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OfferPagedPreview } from '@/modules/offers/components/OfferPagedPreview';
import { composeTemplateHtml, type OfferTemplateRenderData } from '@/modules/offers/utils/offerTemplateRender';
import type {
  OfferCandidateValidationResponse,
  OfferCandidateValidationResult,
  OfferTemplate,
  OfferTemplateCategory,
} from '@/modules/offers/types/offerTypes';

interface OfferSendConfirmDialogProps {
  readonly open: boolean;
  readonly validation: OfferCandidateValidationResponse | null;
  readonly sending: boolean;
  readonly template: OfferTemplate | null;
  readonly category: OfferTemplateCategory | null;
  readonly renderData: OfferTemplateRenderData;
  readonly nameOverrides: Record<string, string>;
  readonly onOpenChange: (open: boolean) => void;
  readonly onNameOverrideSave: (applicationId: string, displayName: string) => void;
  readonly onConfirm: () => void;
}

function candidateLabel(item: OfferCandidateValidationResult) {
  const candidate = item.candidate;
  if (!candidate) return item.applicationId;
  return `${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email || item.applicationId;
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const [firstName = '', lastName = ''] = displayName.trim().replace(/\s+/g, ' ').split(/ (.*)/, 2);
  return { firstName, lastName };
}

export function OfferSendConfirmDialog({
  open,
  validation,
  sending,
  template,
  category,
  renderData,
  nameOverrides,
  onOpenChange,
  onNameOverrideSave,
  onConfirm,
}: OfferSendConfirmDialogProps) {
  const [previewCandidate, setPreviewCandidate] = useState<OfferCandidateValidationResult | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const validCandidates = validation?.validCandidates ?? [];
  const blockedCandidates = validation?.blockedCandidates ?? [];
  const previewCandidateName = previewCandidate ? nameOverrides[previewCandidate.applicationId] ?? candidateLabel(previewCandidate) : '';
  const draftName = draftDisplayName.trim();
  const renderName = draftName || previewCandidateName;
  const previewHtml = useMemo(() => {
    if (!template || !category || !previewCandidate?.candidate) return '';
    const { firstName, lastName } = splitDisplayName(renderName);
    return composeTemplateHtml(template, category, {
      ...renderData,
      firstName,
      lastName,
    });
  }, [category, previewCandidate, renderData, renderName, template]);

  function openPreview(item: OfferCandidateValidationResult) {
    setPreviewCandidate(item);
    setDraftDisplayName(nameOverrides[item.applicationId] ?? candidateLabel(item));
  }

  function savePreviewName() {
    if (!previewCandidate || !draftName) return;
    onNameOverrideSave(previewCandidate.applicationId, draftName);
    setPreviewCandidate(null);
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="rounded-2xl bg-surface shadow-[var(--shadow-4)] sm:max-w-2xl">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle>Send offers</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-100">
            {validCandidates.map((item) => (
              <div key={item.applicationId} className="flex items-start justify-between gap-3 border-b border-neutral-100 px-3 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{nameOverrides[item.applicationId] ?? candidateLabel(item)}</p>
                  <p className="truncate text-xs text-neutral-500">{item.candidate?.email ?? 'No email'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.eligibility.warnings.length > 0 ? (
                    <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
                      Warning
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    disabled={!template || !category}
                    onClick={() => openPreview(item)}
                  >
                    <FileText className="size-3.5" />
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {blockedCandidates.length > 0 ? (
            <p className="text-xs text-warning-text">
              {blockedCandidates.length} blocked candidate{blockedCandidates.length === 1 ? '' : 's'} will be skipped.
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
              disabled={sending || validCandidates.length === 0}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send offers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(previewCandidate)} onOpenChange={(nextOpen) => {
        if (!nextOpen) setPreviewCandidate(null);
      }}>
        <DialogContent className="z-[60] flex h-[86dvh] w-[88vw] !max-w-[88vw] flex-col gap-0 overflow-hidden rounded-2xl bg-surface p-0 shadow-[var(--shadow-4)]">
          <div className="absolute right-14 top-4 z-10 flex items-center gap-2">
            <Input
              value={draftDisplayName}
              onChange={(event) => setDraftDisplayName(event.target.value)}
              className="h-8 w-56 bg-surface text-sm"
              aria-label="Offer preview candidate name"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 bg-primary hover:bg-primary-hover"
              disabled={!draftName}
              onClick={savePreviewName}
            >
              Save
            </Button>
          </div>
          <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 py-4 pr-96">
            <DialogTitle className="text-lg font-semibold text-neutral-900">Offer letter preview</DialogTitle>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{renderName}</p>
              <p className="truncate text-xs text-neutral-500">{previewCandidate?.candidate?.email ?? 'No email'}</p>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-canvas">
            <OfferPagedPreview
              html={previewHtml}
              ariaLabel={`Offer letter preview for ${previewCandidateName || 'candidate'}`}
              emptyState={(
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  Offer preview is unavailable
                </div>
              )}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
