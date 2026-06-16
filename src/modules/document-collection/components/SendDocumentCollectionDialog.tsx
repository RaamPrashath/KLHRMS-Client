'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DocumentCollectionTemplatePicker } from '@/modules/document-collection/components/DocumentCollectionTemplatePicker';
import {
  useDocumentCollectionTemplate,
  useDocumentCollectionTemplates,
  useSendDocumentCollectionRequests,
} from '@/modules/document-collection/hooks/useDocumentCollection';
import type { DocumentCollectionTemplate } from '@/modules/document-collection/types/documentCollectionTypes';
import type { AcceptedOnboardingCandidate } from '@/modules/onboarding/types/onboardingTypes';

interface SendDocumentCollectionDialogProps {
  readonly open: boolean;
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly stageSlug: string;
  readonly selectedCandidates: AcceptedOnboardingCandidate[];
  readonly selectedTemplateId: string | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectedTemplateChange: (templateId: string | null) => void;
  readonly onSent: () => void;
}

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function fieldTypeLabel(value: string): string {
  if (value === 'FILE_UPLOAD') return 'File upload';
  if (value === 'SHORT_TEXT') return 'Short text';
  if (value === 'LONG_TEXT') return 'Long text';
  if (value === 'DATE') return 'Date';
  return value;
}

function formatBytes(value: number | null): string {
  if (!value) return 'No max size';
  const mb = value / 1024 / 1024;
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB max`;
}

function TemplatePreview({ template }: { readonly template: DocumentCollectionTemplate | null }) {
  const fields = useMemo(
    () => [...(template?.fields ?? [])].sort((left, right) => left.order - right.order),
    [template?.fields],
  );

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Select a template to preview
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-100 bg-surface p-6 shadow-[var(--shadow-1)]">
        <div className="border-b border-neutral-100 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-ghost text-primary">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-neutral-900">{template.name}</h3>
              {template.description ? (
                <p className="mt-1 text-sm text-neutral-500">{template.description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">{field.name}</p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      field.required ? 'bg-warning-bg text-warning-text' : 'bg-neutral-50 text-neutral-500',
                    )}>
                      {field.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {field.description ? (
                    <p className="mt-1 text-xs text-neutral-500">{field.description}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
                  {fieldTypeLabel(field.fieldType)}
                </span>
              </div>
              {field.fieldType === 'FILE_UPLOAD' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-500">
                    {field.allowedFormatGroup}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-neutral-500">
                    {formatBytes(field.maxSizeBytes)}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SendDocumentCollectionDialog({
  open,
  orgSlug,
  memberId,
  jobSlug,
  stageSlug,
  selectedCandidates,
  selectedTemplateId,
  onOpenChange,
  onSelectedTemplateChange,
  onSent,
}: SendDocumentCollectionDialogProps) {
  const [templateSearch, setTemplateSearch] = useState('');
  const templatesQuery = useDocumentCollectionTemplates(orgSlug, memberId, templateSearch, 'ACTIVE');
  const selectedTemplateQuery = useDocumentCollectionTemplate(orgSlug, memberId, selectedTemplateId);
  const sendRequests = useSendDocumentCollectionRequests(orgSlug, memberId, jobSlug, stageSlug);

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);
  const selectedTemplate = selectedTemplateQuery.data ?? null;

  useEffect(() => {
    if (!open || selectedTemplateId || templates.length === 0) return;
    onSelectedTemplateChange(templates[0]?.id ?? null);
  }, [open, onSelectedTemplateChange, selectedTemplateId, templates]);

  const canSend = selectedCandidates.length > 0 && Boolean(selectedTemplateId);

  async function handleSend() {
    if (!selectedTemplateId) {
      toast.error('Select a document collection template first');
      return;
    }
    try {
      const result = await sendRequests.mutateAsync({
        templateId: selectedTemplateId,
        applicationIds: selectedCandidates.map((candidate) => candidate.applicationId),
      });
      onOpenChange(false);
      onSent();
      toast.success(`Document request sent to ${result.requestedCount} candidate${result.requestedCount === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to send document requests'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80dvh] w-[80vw] !max-w-[80vw] flex-col gap-0 overflow-hidden rounded-2xl bg-surface p-0 shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-neutral-900">Send document request</DialogTitle>
          <DialogDescription className="sr-only">
            Select a published document collection template and send it to the selected candidates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-neutral-100 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] md:divide-x md:divide-y-0">
          <DocumentCollectionTemplatePicker
            orgSlug={orgSlug}
            memberId={memberId}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            search={templateSearch}
            loading={templatesQuery.isLoading}
            onSearchChange={setTemplateSearch}
            onSelectTemplate={onSelectedTemplateChange}
            onReloadTemplates={() => templatesQuery.refetch()}
          />
          <div className="min-h-0 overflow-y-auto">
            {selectedTemplateQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                Loading template
              </div>
            ) : (
              <TemplatePreview template={selectedTemplate} />
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-neutral-100 px-6 py-4 sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-neutral-700">
            {selectedCandidates.length} candidate{selectedCandidates.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sendRequests.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover"
              disabled={!canSend || sendRequests.isPending}
              onClick={() => void handleSend()}
            >
              {sendRequests.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
