import { describe, expect, it } from 'vitest';

import { composeTemplateHtml } from '@/modules/offers/utils/offerTemplateRender';
import type { OfferTemplate, OfferTemplateCategory } from '@/modules/offers/types/offerTypes';

const category: OfferTemplateCategory = {
  id: 'category-1',
  organizationId: 'org-1',
  templateId: 'template-1',
  name: 'General',
  slug: 'general',
  order: 1,
  createdAt: '2026-06-19T00:00:00.000Z',
  updatedAt: '2026-06-19T00:00:00.000Z',
};

function templateWithFooter(footerHtml: string): OfferTemplate {
  return {
    id: 'template-1',
    organizationId: 'org-1',
    name: 'Offer',
    description: null,
    status: 'ACTIVE',
    logoUrl: null,
    signatureUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    lastUsedAt: null,
    footerHtml,
    websiteUrl: 'http://www.kovanlabs.com',
    createdByMemberId: null,
    updatedByMemberId: null,
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z',
    categories: [category],
    sections: [
      {
        id: 'section-1',
        organizationId: 'org-1',
        templateId: 'template-1',
        categoryId: category.id,
        sectionKey: 'opening',
        sectionName: 'Opening',
        order: 1,
        tiptapJson: {},
        html: '<p>Hello {{candidate.firstName}}</p>',
        createdAt: '2026-06-19T00:00:00.000Z',
        updatedAt: '2026-06-19T00:00:00.000Z',
      },
    ],
  };
}

describe('offerTemplateRender footer repair', () => {
  it('normalizes legacy stacked footers into the two-column footer layout', () => {
    const html = composeTemplateHtml(
      templateWithFooter(
        '<div class="offer-signature-slot"><img src="https://cdn.example.com/sign.png" alt=""><p class="offer-signature-name">(Mouniesh)</p><p>Intern</p></div>'
          + '<p>Kovan Technology Labs India Private Limited</p>'
          + '<p>64 - Sri Lakshmi Nagar</p>'
          + '<p>Coimbatore</p>'
          + '<a href="http://www.kovanlabs.com">www.kovanlabs.com</a>',
      ),
      category,
    );

    expect(html).toContain('<div class="offer-letter-footer">');
    expect(html).toContain('<p class="offer-signature-closing">Sincerely,</p><img src="https://cdn.example.com/sign.png"');
    expect(html).toContain('<div class="offer-footer-address"><p>Kovan Technology Labs India Private Limited</p><p>64 - Sri Lakshmi Nagar</p><p>Coimbatore</p></div>');
    expect(html).toMatch(/<a\b[^>]*href="http:\/\/www\.kovanlabs\.com"[^>]*class="offer-footer-website"[^>]*>www\.kovanlabs\.com<\/a>/);
  });

  it('repairs malformed footer wrappers with unclassified address and website children', () => {
    const html = composeTemplateHtml(
      templateWithFooter(
        '<div class="offer-letter-footer">'
          + '<div class="offer-signature-slot"><img src="https://cdn.example.com/sign.png" alt=""><p class="offer-signature-name">(Mouniesh)</p><p>Intern</p></div>'
          + '<p>Kovan Technology Labs India Private Limited</p>'
          + '<p>64 - Sri Lakshmi Nagar</p>'
          + '<a href="http://www.kovanlabs.com">www.kovanlabs.com</a>'
          + '</div>',
      ),
      category,
    );

    expect(html).toContain('<div class="offer-footer-address"><p>Kovan Technology Labs India Private Limited</p><p>64 - Sri Lakshmi Nagar</p></div>');
    expect(html).toMatch(/<a\b[^>]*href="http:\/\/www\.kovanlabs\.com"[^>]*class="offer-footer-website"[^>]*>www\.kovanlabs\.com<\/a>/);
  });
});
