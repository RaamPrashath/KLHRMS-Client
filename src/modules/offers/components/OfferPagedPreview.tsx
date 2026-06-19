'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { splitPreviewPages } from '@/modules/offers/utils/offerTemplateRender';

const PAGE_WIDTH = 794;
const PAGE_MIN_HEIGHT = 1123;
const PAGE_GAP = 24;
const PAGE_PADDING_TOP = 90;
const PAGE_PADDING_BOTTOM = 90;
const PAGE_PADDING_X = 76;
const CORNER_MARK_TOP = 28;
const CORNER_MARK_LEFT = 28;
const CORNER_MARK_HEIGHT = 68;
const CORNER_MARK_WIDTH = 19;
const BRAND_GAP_FROM_CORNER_MARK = 20;
const LOGO_MAX_HEIGHT = 56;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2;
const CONTENT_HEIGHT = PAGE_MIN_HEIGHT - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
const FOOTER_PIN_THRESHOLD = CONTENT_HEIGHT * 0.6;

const CONTENT_CLASS_NAME = cn(
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
  '[&_footer]:mt-[22px] [&_footer]:break-inside-avoid [&_footer]:pt-0 [&_footer]:text-[13px] [&_footer]:leading-[19px] [&_footer]:text-neutral-900 [&_footer_p]:mb-0 [&_footer_p]:leading-[19px]',
  '[&_footer.offer-footer-pinned]:absolute [&_footer.offer-footer-pinned]:bottom-0 [&_footer.offer-footer-pinned]:left-0 [&_footer.offer-footer-pinned]:right-0 [&_footer.offer-footer-pinned]:mt-0',
  '[&_.offer-letter-footer]:grid [&_.offer-letter-footer]:grid-cols-[minmax(0,1fr)_auto] [&_.offer-letter-footer]:items-end [&_.offer-letter-footer]:gap-x-14',
  '[&_.offer-signature-slot]:col-start-1 [&_.offer-signature-slot]:row-start-1 [&_.offer-signature-slot]:mb-4 [&_.offer-signature-slot]:break-inside-avoid [&_.offer-signature-slot_p]:mb-0 [&_.offer-signature-slot_p]:leading-[18px] [&_.offer-signature-slot_img]:mb-0 [&_.offer-signature-slot_img]:block [&_.offer-signature-slot_img]:max-h-20 [&_.offer-signature-slot_img]:max-w-32 [&_.offer-signature-slot_img]:object-contain',
  '[&_.offer-signature-name]:mb-0 [&_.offer-signature-name]:font-semibold [&_.offer-footer-address]:col-start-1 [&_.offer-footer-address]:row-start-2 [&_.offer-footer-address]:mt-0 [&_.offer-footer-address_p]:mb-0 [&_.offer-footer-address_p]:leading-[19px]',
  '[&_.offer-footer-website]:col-start-2 [&_.offer-footer-website]:row-start-2 [&_.offer-footer-website]:self-center [&_.offer-footer-website]:whitespace-nowrap [&_.offer-footer-website]:text-[16px] [&_.offer-footer-website]:font-bold [&_.offer-footer-website]:leading-5 [&_.offer-footer-website]:!text-neutral-900 [&_.offer-footer-website]:!no-underline',
);

interface OfferPagedPreviewProps {
  readonly html: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly emptyState?: ReactNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function contentStyle(): CSSProperties {
  return {
    '--offer-header-brand-left': `${CORNER_MARK_LEFT + CORNER_MARK_WIDTH + BRAND_GAP_FROM_CORNER_MARK - PAGE_PADDING_X}px`,
    '--offer-header-brand-top': `${CORNER_MARK_TOP + (CORNER_MARK_HEIGHT - LOGO_MAX_HEIGHT) / 2 - PAGE_PADDING_TOP}px`,
    minHeight: `${CONTENT_HEIGHT}px`,
    position: 'relative',
  } as CSSProperties;
}

function isBlankHtml(value: string): boolean {
  const element = document.createElement('div');
  element.innerHTML = value;
  return !element.textContent?.trim() && element.querySelectorAll('img, table, hr, [data-page-break]').length === 0;
}

function htmlToFlowUnits(html: string): string[] {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const units: string[] = [];

  for (const node of Array.from(wrapper.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
    if (!(node instanceof HTMLElement)) {
      const text = node.textContent?.trim();
      if (text) units.push(text);
      continue;
    }

    if (node.tagName === 'FOOTER' || node.dataset.section === 'metadata') {
      units.push(node.outerHTML);
      continue;
    }

    if (node.tagName === 'SECTION') {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) continue;
        units.push(child instanceof HTMLElement ? child.outerHTML : child.textContent ?? '');
      }
      continue;
    }

    units.push(node.outerHTML);
  }

  return units.filter((unit) => !isBlankHtml(unit));
}

function splitBodyAndFooterHtml(html: string): { bodyHtml: string; footerHtml: string | null } {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const footer = wrapper.querySelector('footer');
  if (!footer) return { bodyHtml: html, footerHtml: null };
  const footerHtml = footer.outerHTML;
  footer.remove();
  return { bodyHtml: wrapper.innerHTML, footerHtml };
}

function footerWithPinnedClass(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const footer = template.content.firstElementChild;
  if (!(footer instanceof HTMLElement)) return html;
  footer.classList.add('offer-footer-pinned');
  return footer.outerHTML;
}

function measureFooterHeight(root: HTMLElement, footerHtml: string): number {
  const measure = document.createElement('div');
  measure.className = CONTENT_CLASS_NAME;
  Object.assign(measure.style, contentStyle(), { width: `${CONTENT_WIDTH}px`, minHeight: '0' });
  measure.innerHTML = footerHtml;
  root.appendChild(measure);
  const height = measure.scrollHeight;
  measure.remove();
  return height;
}

function measuredPreviewPages(html: string): Array<{ html: string }> {
  const manualPages = splitPreviewPages(html).map((page) => page.html);
  const measurementRoot = document.createElement('div');
  measurementRoot.style.position = 'absolute';
  measurementRoot.style.left = '-10000px';
  measurementRoot.style.top = '0';
  measurementRoot.style.visibility = 'hidden';
  measurementRoot.style.pointerEvents = 'none';
  measurementRoot.style.width = `${CONTENT_WIDTH}px`;
  document.body.appendChild(measurementRoot);

  try {
    const pages: Array<{ html: string }> = [];
    const current = document.createElement('div');
    current.className = CONTENT_CLASS_NAME;
    Object.assign(current.style, contentStyle(), { width: `${CONTENT_WIDTH}px`, minHeight: '0' });
    measurementRoot.appendChild(current);

    const flush = () => {
      const htmlValue = current.innerHTML.trim();
      if (htmlValue) pages.push({ html: htmlValue });
      current.innerHTML = '';
    };

    for (const manualPage of manualPages) {
      const { bodyHtml, footerHtml } = splitBodyAndFooterHtml(manualPage);
      for (const unit of htmlToFlowUnits(bodyHtml)) {
        const fragment = document.createElement('template');
        fragment.innerHTML = unit;
        const clone = fragment.content.cloneNode(true);
        current.appendChild(clone);

        if (current.scrollHeight > CONTENT_HEIGHT && current.childNodes.length > 1) {
          const overflowNode = current.lastChild;
          if (overflowNode) current.removeChild(overflowNode);
          flush();
          if (overflowNode) current.appendChild(overflowNode);
        }
      }
      if (footerHtml) {
        const bodyHeight = current.scrollHeight;
        const footerHeight = measureFooterHeight(measurementRoot, footerHtml);
        if (bodyHeight === 0 || bodyHeight > FOOTER_PIN_THRESHOLD) {
          if (bodyHeight <= CONTENT_HEIGHT - footerHeight) {
            current.insertAdjacentHTML('beforeend', footerWithPinnedClass(footerHtml));
          } else {
            flush();
            current.insertAdjacentHTML('beforeend', footerWithPinnedClass(footerHtml));
          }
        } else {
          current.insertAdjacentHTML('beforeend', footerHtml);
          if (current.scrollHeight > CONTENT_HEIGHT && current.childNodes.length > 1) {
            const footerNode = current.lastChild;
            if (footerNode) current.removeChild(footerNode);
            flush();
            if (footerNode) current.appendChild(footerNode);
          }
        }
      }
      flush();
    }

    return pages.length > 0 ? pages : [{ html: '<p><br></p>' }];
  } finally {
    measurementRoot.remove();
  }
}

export function OfferPagedPreview({
  html,
  ariaLabel = 'Offer template preview',
  className,
  emptyState,
}: OfferPagedPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const pages = useMemo(() => {
    if (!html) return [];
    return measuredPreviewPages(html);
  }, [html]);

  const fitToWidth = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextScale = clamp(viewport.clientWidth / PAGE_WIDTH, MIN_SCALE, MAX_SCALE);
    setScale(nextScale);
    setOffset({
      x: (viewport.clientWidth - PAGE_WIDTH * nextScale) / 2,
      y: 0,
    });
  }, []);

  useEffect(() => {
    fitToWidth();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(fitToWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitToWidth]);

  useEffect(() => {
    fitToWidth();
  }, [fitToWidth, pages.length]);

  const handleWheel = useCallback((event: globalThis.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(scale * zoomFactor, MIN_SCALE, MAX_SCALE);
    if (nextScale === scale) return;

    setOffset({
      x: cursorX - ((cursorX - offset.x) / scale) * nextScale,
      y: cursorY - ((cursorY - offset.y) / scale) * nextScale,
    });
    setScale(nextScale);
  }, [offset.x, offset.y, scale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: offset.x,
      y: offset.y,
    };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
  }

  return (
    <div
      ref={viewportRef}
      className={cn(
        'relative h-full min-h-0 overflow-hidden bg-canvas touch-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="region"
      aria-label={ariaLabel}
    >
      {pages.length === 0 ? (
        emptyState ?? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Select a template to preview
          </div>
        )
      ) : (
        <div
          className={cn(
            'absolute left-0 top-0 flex origin-top-left select-none flex-col',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          style={{
            gap: `${PAGE_GAP}px`,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            width: PAGE_WIDTH,
          }}
        >
          {pages.map((page, index) => (
            <article
              key={`${index}-${page.html.length}`}
              className="offer-preview-page bg-surface text-neutral-900 shadow-md relative"
              style={{
                width: PAGE_WIDTH,
                minHeight: PAGE_MIN_HEIGHT,
                padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px ${PAGE_PADDING_BOTTOM}px`,
              }}
            >
              <div
                className="absolute bg-primary"
                style={{
                  top: CORNER_MARK_TOP,
                  left: CORNER_MARK_LEFT,
                  height: CORNER_MARK_HEIGHT,
                  width: CORNER_MARK_WIDTH,
                }}
              />
              <div className="absolute bottom-8 right-[76px] flex items-end gap-1">
                <span className="block h-1.5 w-16 bg-neutral-900" />
                <span className="block h-1.5 w-8 bg-primary" />
              </div>
              <div
                className={CONTENT_CLASS_NAME}
                style={contentStyle()}
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
