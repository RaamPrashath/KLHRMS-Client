'use client';

import { Download, FileText, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { OfferDownloadFormat } from '@/modules/offers/schema/offerSchemas';
import type { OfferCandidateValidationResponse } from '@/modules/offers/types/offerTypes';

interface OfferDownloadConfirmDialogProps {
  readonly open: boolean;
  readonly validation: OfferCandidateValidationResponse | null;
  readonly downloadingFormat: OfferDownloadFormat | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (format: OfferDownloadFormat) => void;
}

function candidateLabel(item: NonNullable<OfferCandidateValidationResponse['validCandidates'][number]>) {
  const candidate = item.candidate;
  if (!candidate) return item.applicationId;
  return `${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email || item.applicationId;
}

export function OfferDownloadConfirmDialog({
  open,
  validation,
  downloadingFormat,
  onOpenChange,
  onConfirm,
}: OfferDownloadConfirmDialogProps) {
  const validCandidates = validation?.validCandidates ?? [];
  const blockedCandidates = validation?.blockedCandidates ?? [];
  const isDownloading = downloadingFormat !== null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl bg-surface shadow-[var(--shadow-4)] sm:max-w-2xl">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle>Download offer letters</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-100">
          {validCandidates.map((item) => (
            <div key={item.applicationId} className="flex items-start justify-between gap-3 border-b border-neutral-100 px-3 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{candidateLabel(item)}</p>
                <p className="truncate text-xs text-neutral-500">{item.candidate?.email ?? 'No email'}</p>
              </div>
              {item.eligibility.warnings.length > 0 ? (
                <span className="shrink-0 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
                  Warning
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                  Included
                </span>
              )}
            </div>
          ))}
        </div>

        {blockedCandidates.length > 0 ? (
          <p className="text-xs text-warning-text">
            {blockedCandidates.length} blocked candidate{blockedCandidates.length === 1 ? '' : 's'} will be skipped.
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDownloading}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            onClick={() => onConfirm('pdf')}
            disabled={isDownloading || validCandidates.length === 0}
          >
            {downloadingFormat === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            PDF
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover"
            onClick={() => onConfirm('docx')}
            disabled={isDownloading || validCandidates.length === 0}
          >
            {downloadingFormat === 'docx' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Word
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
