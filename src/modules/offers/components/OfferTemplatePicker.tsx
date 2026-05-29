'use client';

import { Copy, Edit, FilePlus2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCopyOfferTemplate } from '@/modules/offers/hooks/useOfferTemplates';
import type { OfferTemplateListItem } from '@/modules/offers/types/offerTypes';

interface OfferTemplatePickerProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly templates: OfferTemplateListItem[];
  readonly recentTemplate: OfferTemplateListItem | null;
  readonly selectedTemplateId: string | null;
  readonly search: string;
  readonly loading: boolean;
  readonly onSearchChange: (search: string) => void;
  readonly onSelectTemplate: (templateId: string) => void;
  readonly onDeleteTemplate: (template: OfferTemplateListItem) => void;
}

function formatDate(value: string | null): string {
  if (!value) return 'Never used';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function TemplateRow({
  orgSlug,
  template,
  selected,
  badge,
  onSelect,
  onDeleteTemplate,
  onCopy,
  copying,
}: {
  readonly orgSlug: string;
  readonly template: OfferTemplateListItem;
  readonly selected: boolean;
  readonly badge?: string;
  readonly onSelect: () => void;
  readonly onDeleteTemplate: () => void;
  readonly onCopy: () => void;
  readonly copying: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-neutral-50',
        selected && 'bg-primary-ghost',
      )}
    >
      <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={onSelect}>
        <span className={cn(
          'mt-1 size-2 rounded-full',
          selected ? 'bg-primary' : 'bg-neutral-200',
        )} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-neutral-900">{template.name}</span>
            {badge ? (
              <span className="shrink-0 rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-1 line-clamp-1 text-xs text-neutral-500">
            {template.categoryNames.length > 0 ? template.categoryNames.join(', ') : 'No categories'}
          </span>
          <span className="mt-1 block font-mono text-xs text-neutral-400">
            Last used {formatDate(template.lastUsedAt)}
          </span>
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1">
        <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${template.name}`}>
          <a href={`/${orgSlug}/offer/${template.id}`} target="_blank" rel="noopener noreferrer">
            <Edit className="size-4" />
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy ${template.name}`}
          disabled={copying}
          onClick={onCopy}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive-text hover:bg-destructive-bg hover:text-destructive-text"
          aria-label={`Delete ${template.name}`}
          onClick={onDeleteTemplate}
        >
          <Trash2 className="size-4" />
        </Button>
      </span>
    </div>
  );
}

export function OfferTemplatePicker({
  orgSlug,
  memberId,
  templates,
  recentTemplate,
  selectedTemplateId,
  search,
  loading,
  onSearchChange,
  onSelectTemplate,
  onDeleteTemplate,
}: OfferTemplatePickerProps) {
  const copyTemplate = useCopyOfferTemplate(orgSlug, memberId);
  const visibleTemplates = recentTemplate
    ? templates.filter((template) => template.id !== recentTemplate.id)
    : templates;

  async function copyTemplateRow(template: OfferTemplateListItem) {
    try {
      await copyTemplate.mutateAsync({ templateId: template.id, data: {} });
      toast.success('Template copied');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy template');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-100 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search offer templates"
            placeholder="Search templates"
            className="bg-neutral-50 pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <a
          href={`/${orgSlug}/offer/new`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-sm font-medium text-primary hover:bg-primary-ghost"
        >
          <span className="flex size-8 items-center justify-center rounded-md border border-primary/20 bg-primary-ghost">
            <FilePlus2 className="size-4" />
          </span>
          Create new template
        </a>

        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && recentTemplate ? (
          <TemplateRow
            orgSlug={orgSlug}
            template={recentTemplate}
            selected={selectedTemplateId === recentTemplate.id}
            badge="Recent"
            onSelect={() => onSelectTemplate(recentTemplate.id)}
            onDeleteTemplate={() => onDeleteTemplate(recentTemplate)}
            onCopy={() => void copyTemplateRow(recentTemplate)}
            copying={copyTemplate.isPending}
          />
        ) : null}

        {!loading && visibleTemplates.map((template) => (
          <TemplateRow
            key={template.id}
            orgSlug={orgSlug}
            template={template}
            selected={selectedTemplateId === template.id}
            onSelect={() => onSelectTemplate(template.id)}
            onDeleteTemplate={() => onDeleteTemplate(template)}
            onCopy={() => void copyTemplateRow(template)}
            copying={copyTemplate.isPending}
          />
        ))}

        {!loading && templates.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">No templates found</p>
            <p className="mt-1 text-xs text-neutral-500">Create a template to send offer letters.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
