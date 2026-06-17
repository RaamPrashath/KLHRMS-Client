'use client';

import { Copy, Edit, FilePlus2, MoreVertical, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCopyDocumentCollectionTemplate } from '@/modules/document-collection/hooks/useDocumentCollection';
import type { DocumentCollectionTemplateListItem } from '@/modules/document-collection/types/documentCollectionTypes';

interface DocumentCollectionTemplatePickerProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly templates: DocumentCollectionTemplateListItem[];
  readonly selectedTemplateId: string | null;
  readonly search: string;
  readonly loading: boolean;
  readonly onSearchChange: (search: string) => void;
  readonly onSelectTemplate: (templateId: string) => void;
  readonly onReloadTemplates: () => void;
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
  onSelect,
  onDuplicate,
  duplicating,
}: {
  readonly orgSlug: string;
  readonly template: DocumentCollectionTemplateListItem;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onDuplicate: () => void;
  readonly duplicating: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full items-start gap-3 border-b border-neutral-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-neutral-50',
        selected && 'bg-primary-ghost',
      )}
    >
      <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={onSelect}>
        <span className={cn('mt-1 size-2 rounded-full', selected ? 'bg-primary' : 'bg-neutral-200')} />
        <span className="min-w-0 flex-1 pr-6">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-neutral-900">{template.name}</span>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
              template.status === 'ACTIVE' ? 'bg-success-bg text-success-text' : 'bg-info-bg text-info-text',
            )}>
              {template.status === 'ACTIVE' ? 'Published' : 'Draft'}
            </span>
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            {template.fieldCount} field{template.fieldCount === 1 ? '' : 's'}
          </span>
          <span className="mt-1 block font-mono text-xs text-neutral-400">
            {template.lastUsedAt ? `Last used ${formatDate(template.lastUsedAt)}` : 'Never used'}
          </span>
        </span>
      </button>
      <div className="absolute bottom-2 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 text-neutral-400 hover:text-neutral-700"
              aria-label="Actions"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 bg-surface shadow-md">
            <DropdownMenuItem asChild>
              <a
                href={`/${orgSlug}/document-collection/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full cursor-pointer items-center gap-2"
              >
                <Edit className="size-4" />
                <span>Edit</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={duplicating}
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate();
              }}
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <Copy className="size-4" />
              <span>Duplicate</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function DocumentCollectionTemplatePicker({
  orgSlug,
  memberId,
  templates,
  selectedTemplateId,
  search,
  loading,
  onSearchChange,
  onSelectTemplate,
  onReloadTemplates,
}: DocumentCollectionTemplatePickerProps) {
  const copyTemplate = useCopyDocumentCollectionTemplate(orgSlug, memberId);

  async function duplicateTemplateRow(template: DocumentCollectionTemplateListItem) {
    try {
      await copyTemplate.mutateAsync({
        templateId: template.id,
        data: { name: `${template.name} - Copy` },
      });
      toast.success('Template duplicated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate template');
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
            aria-label="Search document collection templates"
            placeholder="Search templates"
            className="bg-neutral-50 pl-9 pr-10"
          />
          <button
            type="button"
            onClick={onReloadTemplates}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Reload templates"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <a
          href={`/${orgSlug}/document-collection/new`}
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

        {!loading && templates.map((template) => (
          <TemplateRow
            key={template.id}
            orgSlug={orgSlug}
            template={template}
            selected={selectedTemplateId === template.id}
            onSelect={() => onSelectTemplate(template.id)}
            onDuplicate={() => void duplicateTemplateRow(template)}
            duplicating={copyTemplate.isPending}
          />
        ))}

        {!loading && templates.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">No published templates found</p>
            <p className="mt-1 text-xs text-neutral-500">Create and publish a template to send document requests.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
