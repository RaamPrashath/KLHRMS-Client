'use client';

import { Edit, FileText, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OfferTemplate } from '@/modules/offers/types/offerTypes';

interface OfferPreviewPaneProps {
  readonly orgSlug: string;
  readonly template: OfferTemplate | null;
  readonly loading: boolean;
  readonly selectedCategoryId: string | null;
  readonly onCategoryChange: (categoryId: string) => void;
  readonly onDeleteTemplate: (template: OfferTemplate) => void;
}

export function OfferPreviewPane({
  orgSlug,
  template,
  loading,
  selectedCategoryId,
  onCategoryChange,
  onDeleteTemplate,
}: OfferPreviewPaneProps) {
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-50 text-neutral-400">
          <FileText className="size-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-neutral-900">Select a template</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          The selected offer letter preview will appear here.
        </p>
      </div>
    );
  }

  const selectedCategory = template.categories.find((category) => category.id === selectedCategoryId) ?? template.categories[0] ?? null;
  const sections = selectedCategory
    ? template.sections
        .filter((section) => section.categoryId === selectedCategory.id)
        .sort((left, right) => left.order - right.order)
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-neutral-900">{template.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
              {template.description || 'No description'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${template.name}`}>
              <a href={`/${orgSlug}/offer/${template.id}`} target="_blank" rel="noopener noreferrer">
                <Edit className="size-4" />
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive-text hover:bg-destructive-bg hover:text-destructive-text"
              aria-label={`Delete ${template.name}`}
              onClick={() => onDeleteTemplate(template)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {template.categories.length > 1 ? (
          <div className="mt-3">
            <label className="mb-1.5 block text-[13px] font-medium text-neutral-700" htmlFor="offer-category">
              Category
            </label>
            <Select value={selectedCategory?.id ?? ''} onValueChange={onCategoryChange}>
              <SelectTrigger id="offer-category" className="h-9 w-full bg-surface">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {template.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-lg border border-neutral-100 bg-surface p-4 text-sm leading-6 text-neutral-700">
          {sections.length > 0 ? (
            sections.map((section) => (
              <section key={section.id} className="border-b border-neutral-100 py-3 first:pt-0 last:border-0 last:pb-0">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {section.sectionName}
                </h4>
                {section.html.trim() ? (
                  <div
                    className={cn(
                      'space-y-2 text-[13px] leading-6 text-neutral-700',
                      '[&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc',
                    )}
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                ) : (
                  <p className="text-xs text-neutral-400">No content yet.</p>
                )}
              </section>
            ))
          ) : (
            <p className="text-xs text-neutral-400">No sections available for this category.</p>
          )}
          {template.footerHtml ? (
            <section className="mt-3 border-t border-neutral-100 pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Footer</h4>
              <div
                className="space-y-2 text-[13px] leading-6 text-neutral-700"
                dangerouslySetInnerHTML={{ __html: template.footerHtml }}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
