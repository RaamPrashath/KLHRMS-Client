'use client';

import { Download, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOfferApplicationLetters } from '@/modules/offers/hooks/useOfferApplicationLetters';
import type { OfferLetter } from '@/modules/offers/types/offerTypes';

interface OfferLettersPanelProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly applicationId: string;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function statusClasses(status: string): string {
  if (status === 'ACCEPTED') return 'bg-success-bg text-success-text';
  if (status === 'REJECTED' || status === 'FAILED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'EXPIRED' || status === 'WITHDRAWN') return 'bg-warning-bg text-warning-text';
  if (status === 'SENT') return 'bg-info-bg text-info-text';
  return 'bg-neutral-50 text-neutral-500';
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function OfferLetterRow({ offer }: { readonly offer: OfferLetter }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(offer.status))}>
              {statusLabel(offer.status)}
            </span>
            {offer.fileName ? (
              <span className="truncate text-xs text-neutral-500">{offer.fileName}</span>
            ) : null}
          </div>
          <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-neutral-500 sm:grid-cols-2">
            <span>Sent: <span className="font-mono">{formatDateTime(offer.sentAt ?? offer.emailSentAt)}</span></span>
            <span>Expires: <span className="font-mono">{formatDateTime(offer.expiresAt)}</span></span>
            <span>Responded: <span className="font-mono">{formatDateTime(offer.respondedAt)}</span></span>
            <span>Created: <span className="font-mono">{formatDateTime(offer.createdAt)}</span></span>
          </div>
          {offer.emailError ? (
            <p className="mt-2 line-clamp-2 text-xs text-destructive-text">{offer.emailError}</p>
          ) : null}
        </div>
        {offer.pdfUrl ? (
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0 px-2">
            <a href={offer.pdfUrl} target="_blank" rel="noreferrer">
              <Download className="size-3.5" />
              PDF
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OfferLettersPanel({ orgSlug, memberId, applicationId }: OfferLettersPanelProps) {
  const query = useOfferApplicationLetters(orgSlug, memberId, applicationId);
  const offers = query.data?.offerLetters ?? [];

  return (
    <section className="rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-[17px] font-semibold text-neutral-900">Offer letters</h2>
        </div>
        {query.isFetching ? <Loader2 className="size-4 animate-spin text-neutral-400" /> : null}
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : offers.length > 0 ? (
        <div className="space-y-2">
          {offers.map((offer) => (
            <OfferLetterRow key={offer.id} offer={offer} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-canvas px-4 py-6 text-center">
          <p className="text-sm font-medium text-neutral-900">No offer letters yet</p>
          <p className="mt-1 text-xs text-neutral-500">Generated offer PDFs will appear here.</p>
        </div>
      )}
    </section>
  );
}
