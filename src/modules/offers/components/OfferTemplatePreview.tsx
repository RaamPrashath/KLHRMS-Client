'use client';

import { OfferPagedPreview } from '@/modules/offers/components/OfferPagedPreview';
import { composeTemplateHtml } from '@/modules/offers/utils/offerTemplateRender';
import type { OfferTemplate, OfferTemplateCategory } from '@/modules/offers/types/offerTypes';

interface OfferTemplatePreviewProps {
  readonly template: OfferTemplate | null;
  readonly category: OfferTemplateCategory | null;
}

export function OfferTemplatePreview({
  template,
  category,
}: OfferTemplatePreviewProps) {
  const html = template && category ? composeTemplateHtml(template, category) : '';

  return (
    <OfferPagedPreview
      html={html}
      ariaLabel="Offer template preview"
      emptyState={(
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          {template ? 'Select a category to preview' : 'Select a template to preview'}
        </div>
      )}
    />
  );
}
