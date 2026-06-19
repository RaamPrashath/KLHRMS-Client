import type { OfferTemplate, OfferTemplateCategory } from '@/modules/offers/types/offerTypes';

interface JsonNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: JsonNode[];
}

interface PreviewPage {
  html: string;
}

const PARAGRAPH_PATTERN = /<p\b[^>]*>(.*?)<\/p>/gis;
const HEADING_PATTERN = /<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/gis;
const TAG_PATTERN = /<[^>]+>/g;
const DEFAULT_KOVAN_LOGO_SVG = (
  'data:image/svg+xml;base64,'
  + 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNzYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCAxNzYgNTYiPjxwYXRoIGQ9Ik0xIDFoMTl2NTRIMXoiIGZpbGw9IiMwMDg3NEEiLz48cGF0aCBkPSJNMzUgMTVoMTN2MjZIMzV6IiBmaWxsPSIjMDBBNjU0Ii8+PHBhdGggZD0iTTUwIDE1aDEzdjI2SDUweiIgZmlsbD0iI0VBNDMzNSIvPjxwYXRoIGQ9Ik02NSAxNWgxM3YyNkg2NXoiIGZpbGw9IiNGQkJDMDEiLz48cGF0aCBkPSJNNzcuNSAyOGwtMTIgMTNWMzNMMzUgNDFWMTVsMzAgMjYgMTItMTN6IiBmaWxsPSIjNDI4NUY0IiBvcGFjaXR5PSIuOTUiLz48dGV4dCB4PSI5MiIgeT0iMzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIzIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjNmU2ZTczIj5Lb3ZhbiBMYWJzPC90ZXh0Pjwvc3ZnPg=='
);

export interface PreviewSampleData {
  firstName: string;
  lastName: string;
  generatedDate: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
}

export type OfferTemplateRenderData = PreviewSampleData;

export const DEFAULT_PREVIEW_SAMPLE: PreviewSampleData = {
  firstName: 'Ananya',
  lastName: 'Raman',
  generatedDate: new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date()),
  salaryMin: '12,00,000',
  salaryMax: '16,00,000',
  currency: 'INR',
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceVariables(value: string, sample: OfferTemplateRenderData): string {
  const replacements: Record<string, string> = {
    'candidate.firstName': sample.firstName,
    'candidate.lastName': sample.lastName,
    'offer.generatedDate': sample.generatedDate,
    'job.salaryMin': sample.salaryMin,
    'job.salaryMax': sample.salaryMax,
    'job.currency': sample.currency,
  };
  return value.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)\s*\}\}/g,
    (match, token: string) => replacements[token] ?? match,
  );
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === 'undefined') {
    return value
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&amp;', '&');
  }
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
}

function htmlText(value: string): string {
  return decodeHtmlEntities(value.replace(TAG_PATTERN, ' ')).split(/\s+/).filter(Boolean).join(' ');
}

function logoHtml(logoUrl: string | null): string {
  const src = logoUrl?.trim() || DEFAULT_KOVAN_LOGO_SVG;
  return `<img class="offer-letter-logo" src="${escapeHtml(src)}" alt="Kovan Labs" />`;
}

function normalizeMetadataHeaderHtml(html: string, template: OfferTemplate): string {
  if (html.includes('offer-letter-header')) {
    if (html.includes('offer-letter-logo')) return html;
    return html.replace(
      /(<div\b[^>]*class=["'][^"']*\boffer-letter-header-brand\b[^"']*["'][^>]*>)/i,
      `$1${logoHtml(template.logoUrl)}`,
    );
  }

  const paragraphs = Array.from(html.matchAll(PARAGRAPH_PATTERN)).map((match) => htmlText(match[1] ?? ''));
  const headings = Array.from(html.matchAll(HEADING_PATTERN)).map((match) => htmlText(match[1] ?? ''));
  const title = headings[0] || 'Offer Letter';
  const generatedDate = paragraphs[0] ?? '';
  const location = paragraphs[1] ?? '';

  return [
    '<div class="offer-letter-header">',
    '<div class="offer-letter-header-brand">',
    logoHtml(template.logoUrl),
    '</div>',
    '<div class="offer-letter-header-meta">',
    `<p>${escapeHtml(generatedDate)}</p>`,
    `<p>${escapeHtml(location)}</p>`,
    '</div>',
    `<h1>${escapeHtml(title)}</h1>`,
    '</div>',
  ].join('');
}

function repairFooterAssetHtml(html: string, template: OfferTemplate): string {
  html = ensureFooterClosingHtml(html);
  const signatureUrl = template.signatureUrl?.trim();
  if (signatureUrl && !/<img\b/i.test(html)) {
    const image = `<img src="${escapeHtml(signatureUrl)}" alt="" />`;
    const repaired = html.replace(
      /(<p\b[^>]*class=["'][^"']*\boffer-signature-closing\b[^"']*["'][^>]*>\s*Sincerely,\s*<\/p>)/i,
      `$1${image}`,
    );
    html = repaired !== html
      ? repaired
      : `<div class="offer-signature-slot"><p class="offer-signature-closing">Sincerely,</p>${image}</div>${html}`;
  }
  return normalizeFooterLayoutHtml(html, template);
}

function ensureFooterClosingHtml(html: string): string {
  if (/class=["'][^"']*\boffer-signature-closing\b/i.test(html)) return html;
  return html.replace(
    /(<div\b[^>]*class=["'][^"']*\boffer-signature-slot\b[^"']*["'][^>]*>)/i,
    '$1<p class="offer-signature-closing">Sincerely,</p>',
  );
}

function normalizeFooterLayoutHtml(html: string, template: OfferTemplate): string {
  if (typeof document === 'undefined') return html;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const layout = wrapper.querySelector<HTMLElement>('.offer-letter-footer');
  const source = layout ?? wrapper;
  const isCompleteLayout = Boolean(
    layout?.querySelector('.offer-signature-slot')
      && layout.querySelector('.offer-footer-address')
      && (layout.querySelector('.offer-footer-website') || !template.websiteUrl?.trim()),
  );
  if (isCompleteLayout) return html;

  const signature = source.querySelector<HTMLElement>('.offer-signature-slot');
  if (!signature) return html;
  signature.remove();

  const address = source.querySelector<HTMLElement>('.offer-footer-address');
  let addressHtml = '';
  if (address) {
    addressHtml = address.innerHTML.trim();
    address.remove();
  }

  const website = source.querySelector<HTMLAnchorElement>('.offer-footer-website') ?? Array.from(source.querySelectorAll<HTMLAnchorElement>('a')).pop() ?? null;
  let websiteHtml = '';
  if (website) {
    website.remove();
    website.classList.add('offer-footer-website');
    if (!website.getAttribute('href') && template.websiteUrl) website.href = template.websiteUrl;
    websiteHtml = website.outerHTML;
  } else if (template.websiteUrl?.trim()) {
    const href = template.websiteUrl.trim();
    websiteHtml = `<a class="offer-footer-website" href="${escapeHtml(href)}">${escapeHtml(href.replace(/^https?:\/\//, ''))}</a>`;
  }

  if (!addressHtml) {
    addressHtml = Array.from(source.childNodes)
      .map((node) => node instanceof HTMLElement ? node.outerHTML : node.textContent ?? '')
      .join('')
      .trim();
  }

  return [
    '<div class="offer-letter-footer">',
    signature.outerHTML,
    addressHtml ? `<div class="offer-footer-address">${addressHtml}</div>` : '',
    websiteHtml,
    '</div>',
  ].join('');
}

function renderChildren(node: JsonNode, sample: OfferTemplateRenderData): string {
  return (node.content ?? []).map((child) => renderNode(child, sample)).join('');
}

function applyMarks(text: string, marks: JsonNode['marks']): string {
  return (marks ?? []).reduce((current, mark) => {
    if (mark.type === 'bold') return `<strong>${current}</strong>`;
    if (mark.type === 'italic') return `<em>${current}</em>`;
    if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
      return `<a href="${escapeHtml(href)}">${current}</a>`;
    }
    return current;
  }, text);
}

export function renderJsonToHtml(json: Record<string, unknown>, sample: OfferTemplateRenderData = DEFAULT_PREVIEW_SAMPLE): string {
  return renderNode(json as JsonNode, sample);
}

function renderNode(node: JsonNode, sample: OfferTemplateRenderData): string {
  if (node.type === 'text') {
    return applyMarks(replaceVariables(escapeHtml(node.text ?? ''), sample), node.marks);
  }

  if (node.type === 'doc') return renderChildren(node, sample);
  if (node.type === 'paragraph') return `<p>${renderChildren(node, sample) || '<br>'}</p>`;
  if (node.type === 'heading') {
    const level = node.attrs?.level === 3 ? 3 : 2;
    return `<h${level}>${renderChildren(node, sample)}</h${level}>`;
  }
  if (node.type === 'bulletList') return `<ul>${renderChildren(node, sample)}</ul>`;
  if (node.type === 'orderedList') return `<ol>${renderChildren(node, sample)}</ol>`;
  if (node.type === 'listItem') return `<li>${renderChildren(node, sample)}</li>`;
  if (node.type === 'hardBreak') return '<br>';
  if (node.type === 'pageBreak') return '<div data-page-break="true"></div>';
  if (node.type === 'table') return `<table><tbody>${renderChildren(node, sample)}</tbody></table>`;
  if (node.type === 'tableRow') return `<tr>${renderChildren(node, sample)}</tr>`;
  if (node.type === 'tableCell') return `<td>${renderChildren(node, sample)}</td>`;
  if (node.type === 'tableHeader') return `<th>${renderChildren(node, sample)}</th>`;

  return renderChildren(node, sample);
}

export function composeTemplateHtml(
  template: OfferTemplate,
  category: OfferTemplateCategory | null,
  renderData: OfferTemplateRenderData = DEFAULT_PREVIEW_SAMPLE,
): string {
  if (!category) return '';
  const sections = template.sections
    .filter((section) => section.categoryId === category.id)
    .sort((left, right) => left.order - right.order)
    .map((section) => {
      let body = Object.keys(section.tiptapJson).length > 0
        ? renderJsonToHtml(section.tiptapJson, renderData)
        : replaceVariables(section.html, renderData);
      if (section.sectionKey === 'metadata') {
        body = normalizeMetadataHeaderHtml(body, template);
      }
      if (!body.trim()) return '';
      return `<section data-section="${escapeHtml(section.sectionKey)}">${body}</section>`;
    })
    .join('');

  const footer = template.footerHtml
    ? `<footer>${repairFooterAssetHtml(replaceVariables(template.footerHtml, renderData), template)}</footer>`
    : '';
  return `${sections}${footer}`;
}

export function splitPreviewPages(html: string): PreviewPage[] {
  const parts = html
    .split(/<div[^>]*data-page-break=["']true["'][^>]*><\/div>/)
    .map((part) => part.trim());
  const pages = parts.length > 0 ? parts : [html];
  return pages.map((page) => ({ html: page || '<p><br></p>' }));
}

export function findUnknownOfferTokens(html: string): string[] {
  const allowed = new Set([
    'candidate.firstName',
    'candidate.lastName',
    'offer.generatedDate',
    'job.salaryMin',
    'job.salaryMax',
    'job.currency',
  ]);
  const found = Array.from(html.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)\s*\}\}/g))
    .map((match) => match[1])
    .filter((token): token is string => Boolean(token));
  return Array.from(new Set(found.filter((token) => !allowed.has(token))));
}
