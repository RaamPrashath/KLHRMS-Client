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

export interface PreviewSampleData {
  firstName: string;
  lastName: string;
  generatedDate: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
}

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

function replaceVariables(value: string, sample: PreviewSampleData): string {
  return value
    .replaceAll('{{candidate.firstName}}', sample.firstName)
    .replaceAll('{{ candidate.firstName }}', sample.firstName)
    .replaceAll('{{candidate.lastName}}', sample.lastName)
    .replaceAll('{{ candidate.lastName }}', sample.lastName)
    .replaceAll('{{offer.generatedDate}}', sample.generatedDate)
    .replaceAll('{{ offer.generatedDate }}', sample.generatedDate)
    .replaceAll('{{job.salaryMin}}', sample.salaryMin)
    .replaceAll('{{ job.salaryMin }}', sample.salaryMin)
    .replaceAll('{{job.salaryMax}}', sample.salaryMax)
    .replaceAll('{{ job.salaryMax }}', sample.salaryMax)
    .replaceAll('{{job.currency}}', sample.currency)
    .replaceAll('{{ job.currency }}', sample.currency);
}

function renderChildren(node: JsonNode, sample: PreviewSampleData): string {
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

export function renderJsonToHtml(json: Record<string, unknown>, sample: PreviewSampleData = DEFAULT_PREVIEW_SAMPLE): string {
  return renderNode(json as JsonNode, sample);
}

function renderNode(node: JsonNode, sample: PreviewSampleData): string {
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

export function composeTemplateHtml(template: OfferTemplate, category: OfferTemplateCategory | null): string {
  if (!category) return '';
  const sections = template.sections
    .filter((section) => section.categoryId === category.id)
    .sort((left, right) => left.order - right.order)
    .map((section) => {
      const body = Object.keys(section.tiptapJson).length > 0
        ? renderJsonToHtml(section.tiptapJson)
        : replaceVariables(section.html, DEFAULT_PREVIEW_SAMPLE);
      if (!body.trim()) return '';
      return `<section data-section="${escapeHtml(section.sectionKey)}">${body}</section>`;
    })
    .join('');

  const footer = template.footerHtml ? `<footer>${replaceVariables(template.footerHtml, DEFAULT_PREVIEW_SAMPLE)}</footer>` : '';
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
