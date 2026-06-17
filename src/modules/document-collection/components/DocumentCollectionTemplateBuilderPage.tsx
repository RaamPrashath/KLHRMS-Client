'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, ChevronLeft, Copy, FileText, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useCopyDocumentCollectionTemplate,
  useCreateDocumentCollectionTemplate,
  useDeleteDocumentCollectionTemplate,
  useDocumentCollectionTemplate,
  useUpdateDocumentCollectionTemplate,
} from '@/modules/document-collection/hooks/useDocumentCollection';
import type {
  DocumentCollectionAllowedFormatGroup,
  DocumentCollectionFieldInput,
  DocumentCollectionFieldType,
  DocumentCollectionTemplate,
} from '@/modules/document-collection/types/documentCollectionTypes';

interface DocumentCollectionTemplateBuilderPageProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly templateId?: string | null;
  readonly mode: 'new' | 'edit';
}

interface BuilderDraft {
  name: string;
  description: string;
  status: string;
  fields: DocumentCollectionFieldInput[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const pendingCreations = new Set<string>();

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function fieldTypeLabel(value: DocumentCollectionFieldType): string {
  if (value === 'FILE_UPLOAD') return 'File upload';
  if (value === 'SHORT_TEXT') return 'Short text';
  if (value === 'LONG_TEXT') return 'Long text';
  return 'Date';
}

function draftFromTemplate(template: DocumentCollectionTemplate): BuilderDraft {
  return {
    name: template.name,
    description: template.description ?? '',
    status: template.status,
    fields: [...template.fields]
      .sort((left, right) => left.order - right.order)
      .map((field) => ({
        id: field.id,
        fieldType: field.fieldType,
        name: field.name,
        description: field.description,
        required: field.required,
        order: field.order,
        allowedFormatGroup: field.allowedFormatGroup,
        maxSizeBytes: field.maxSizeBytes,
      })),
  };
}

function draftSignature(draft: BuilderDraft): string {
  return JSON.stringify({
    ...draft,
    fields: draft.fields.map((field, index) => ({ ...field, order: index + 1 })),
  });
}

function newField(order: number): DocumentCollectionFieldInput {
  return {
    fieldType: 'FILE_UPLOAD',
    name: 'New field',
    description: null,
    required: true,
    order,
    allowedFormatGroup: 'ALL',
    maxSizeBytes: null,
  };
}

function bytesToMb(value: number | null | undefined): string {
  if (!value) return '';
  return String(Math.round(value / 1024 / 1024));
}

function mbToBytes(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 1024 * 1024);
}

const fieldLabelClass = 'text-[13px] font-semibold text-neutral-700';
const fieldControlClass = 'h-11 border-neutral-200 bg-surface px-4 text-sm font-semibold text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-primary focus-visible:ring-primary/10';
const fieldSelectClass = `!h-11 w-full ${fieldControlClass}`;
const fieldTextareaClass = 'min-h-20 border-neutral-200 bg-surface px-4 py-3 text-sm font-semibold text-neutral-900 shadow-none focus-visible:border-primary focus-visible:ring-primary/10';
const fieldIconButtonClass = 'border-neutral-200 bg-surface text-neutral-700 shadow-none hover:bg-neutral-50 hover:text-neutral-900 disabled:text-neutral-300';

export function DocumentCollectionTemplateBuilderPage({
  orgSlug,
  memberId,
  templateId: initialTemplateId = null,
  mode,
}: DocumentCollectionTemplateBuilderPageProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);
  const [draft, setDraft] = useState<BuilderDraft>({
    name: 'Untitled document collection',
    description: '',
    status: 'DRAFT',
    fields: [newField(1)],
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAttempt, setCreateAttempt] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const createdRef = useRef(false);
  const hydratedTemplateIdRef = useRef<string | null>(null);
  const lastSavedSignatureRef = useRef('');

  const createTemplate = useCreateDocumentCollectionTemplate(orgSlug, memberId);
  const templateQuery = useDocumentCollectionTemplate(orgSlug, memberId, templateId);
  const updateTemplate = useUpdateDocumentCollectionTemplate(orgSlug, memberId, templateId);
  const copyTemplate = useCopyDocumentCollectionTemplate(orgSlug, memberId);
  const deleteTemplate = useDeleteDocumentCollectionTemplate(orgSlug, memberId);
  const template = templateQuery.data ?? null;
  const updateTemplateMutateAsyncRef = useRef(updateTemplate.mutateAsync);

  useEffect(() => {
    updateTemplateMutateAsyncRef.current = updateTemplate.mutateAsync;
  }, [updateTemplate.mutateAsync]);

  useEffect(() => {
    if (mode !== 'new' || templateId || createdRef.current) return;
    const creationKey = `${orgSlug}-${memberId}-${createAttempt}`;
    if (pendingCreations.has(creationKey)) return;
    pendingCreations.add(creationKey);
    createdRef.current = true;
    createTemplate.mutate(
      {
        name: 'Untitled document collection',
        status: 'DRAFT',
        fields: [newField(1)],
      },
      {
        onSuccess: (created) => {
          pendingCreations.delete(creationKey);
          setTemplateId(created.id);
          router.replace(`/${orgSlug}/document-collection/${created.id}`);
        },
        onError: (error) => {
          pendingCreations.delete(creationKey);
          createdRef.current = false;
          const message = readActionError(error, 'Failed to create template');
          setCreateError(message);
          toast.error(message);
        },
      },
    );
  }, [createAttempt, createTemplate, memberId, mode, orgSlug, router, templateId]);

  useEffect(() => {
    if (!template || hydratedTemplateIdRef.current === template.id) return;
    const nextDraft = draftFromTemplate(template);
    setDraft(nextDraft);
    lastSavedSignatureRef.current = draftSignature(nextDraft);
    hydratedTemplateIdRef.current = template.id;
    setSaveState('saved');
  }, [template]);

  useEffect(() => {
    if (!templateId || !template) return;
    const signature = draftSignature(draft);
    if (signature === lastSavedSignatureRef.current) return;
    setSaveState('saving');
    const timeout = window.setTimeout(async () => {
      try {
        const mutateAsync = updateTemplateMutateAsyncRef.current;
        if (!mutateAsync) return;
        const saved = await mutateAsync({
          name: draft.name.trim() || 'Untitled document collection',
          description: draft.description.trim() || null,
          status: draft.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
          fields: draft.fields.map((field, index) => ({
            ...field,
            name: field.name.trim() || `Field ${index + 1}`,
            description: field.description?.trim() || null,
            order: index + 1,
            allowedFormatGroup: field.fieldType === 'FILE_UPLOAD' ? field.allowedFormatGroup : 'ALL',
            maxSizeBytes: field.fieldType === 'FILE_UPLOAD' ? field.maxSizeBytes : null,
          })),
        });
        const savedDraft = draftFromTemplate(saved);
        setDraft(savedDraft);
        lastSavedSignatureRef.current = draftSignature(savedDraft);
        hydratedTemplateIdRef.current = saved.id;
        setSaveState('saved');
      } catch (error) {
        setSaveState('error');
        toast.error(readActionError(error, 'Failed to autosave template'));
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [draft, template, templateId]);

  function updateField(index: number, patch: Partial<DocumentCollectionFieldInput>) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index
          ? {
              ...field,
              ...patch,
              allowedFormatGroup: (patch.fieldType && patch.fieldType !== 'FILE_UPLOAD')
                ? 'ALL'
                : ('allowedFormatGroup' in patch ? patch.allowedFormatGroup : field.allowedFormatGroup) ?? 'ALL',
              maxSizeBytes: (patch.fieldType && patch.fieldType !== 'FILE_UPLOAD')
                ? null
                : ('maxSizeBytes' in patch ? patch.maxSizeBytes : field.maxSizeBytes) ?? null,
            }
          : field,
      ),
    }));
  }

  function moveField(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.fields.length) return current;
      const fields = [...current.fields];
      const [item] = fields.splice(index, 1);
      fields.splice(nextIndex, 0, item);
      return { ...current, fields };
    });
  }

  async function publishTemplate() {
    if (!templateId) return;
    try {
      const saved = await updateTemplate.mutateAsync({
        ...draft,
        status: 'ACTIVE',
        description: draft.description.trim() || null,
        fields: draft.fields.map((field, index) => ({ ...field, order: index + 1 })),
      });
      setDraft(draftFromTemplate(saved));
      toast.success('Template published');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to publish template'));
    }
  }

  async function copyCurrentTemplate() {
    if (!templateId) return;
    try {
      const copied = await copyTemplate.mutateAsync({ templateId, data: {} });
      router.push(`/${orgSlug}/document-collection/${copied.id}`);
      toast.success('Template copied');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to copy template'));
    }
  }

  async function deleteCurrentTemplate() {
    if (!templateId) return;
    try {
      await deleteTemplate.mutateAsync({ templateId });
      router.push(`/${orgSlug}/candidates`);
      toast.success('Template deleted');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to delete template'));
    }
  }

  if (mode === 'new' && !templateId) {
    if (createError) {
      return (
        <div className="flex min-h-full items-center justify-center bg-canvas p-6">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 text-center shadow-sm">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive-bg text-destructive-text">
              <AlertCircle className="size-5" />
            </div>
            <h1 className="mt-4 text-base font-semibold text-neutral-900">Could not create template</h1>
            <p className="mt-2 text-sm text-neutral-500">{createError}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateError(null);
                  createdRef.current = false;
                  setCreateAttempt((attempt) => attempt + 1);
                }}
              >
                Try again
              </Button>
              <Button type="button" onClick={() => router.push(`/${orgSlug}/candidates`)}>
                Back to candidates
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <Loader2 className="mr-2 size-4 animate-spin text-primary" />
        Creating template
      </div>
    );
  }

  if (templateQuery.isLoading && !template) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <Loader2 className="mr-2 size-4 animate-spin text-primary" />
        Loading template
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-neutral-100 bg-surface/95 px-4 py-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => router.back()}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h1 className="truncate text-lg font-semibold text-neutral-900">Document collection builder</h1>
              <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {draft.status === 'ACTIVE' ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save failed' : 'Autosaved'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyCurrentTemplate()} disabled={!templateId || copyTemplate.isPending}>
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button variant="outline" size="sm" className="text-destructive-text" onClick={() => setDeleteOpen(true)} disabled={!templateId}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-hover" onClick={() => void publishTemplate()} disabled={!templateId || updateTemplate.isPending}>
            <Send className="size-3.5" />
            Publish
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-6 py-6">
        <section className="rounded-xl bg-surface p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">Template name</span>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Document collection name"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">Description</span>
              <Textarea
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional instructions for HR and candidates"
                rows={3}
              />
            </label>
          </div>
        </section>

        <section className="bg-transparent">
          <div className="flex items-center justify-between pb-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Fields</h2>
              <p className="mt-0.5 text-sm font-medium text-neutral-500">Add the items candidates must complete</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 border-neutral-200 bg-surface px-5 text-base font-semibold text-neutral-900 shadow-none hover:bg-neutral-50"
              onClick={() => setDraft((current) => ({ ...current, fields: [...current.fields, newField(current.fields.length + 1)] }))}
            >
              <Plus className="size-4" />
              Add field
            </Button>
          </div>

          <div className="space-y-4">
            {draft.fields.map((field, index) => (
              <div key={field.id ?? `new-${index}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/70">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-surface px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-700">Field {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon-sm" className={fieldIconButtonClass} disabled={index === 0} onClick={() => moveField(index, -1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon-sm" className={fieldIconButtonClass} disabled={index === draft.fields.length - 1} onClick={() => moveField(index, 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={`${fieldIconButtonClass} text-destructive-text hover:text-destructive-text`}
                      onClick={() => setDraft((current) => ({ ...current, fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index) }))}
                      disabled={draft.fields.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={fieldLabelClass}>Name</span>
                      <Input className={fieldControlClass} value={field.name} onChange={(event) => updateField(index, { name: event.target.value })} />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={fieldLabelClass}>Type</span>
                      <Select value={field.fieldType} onValueChange={(value) => updateField(index, { fieldType: value as DocumentCollectionFieldType })}>
                        <SelectTrigger className={fieldSelectClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['FILE_UPLOAD', 'SHORT_TEXT', 'LONG_TEXT', 'DATE'] as DocumentCollectionFieldType[]).map((type) => (
                            <SelectItem key={type} value={type}>{fieldTypeLabel(type)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className={fieldLabelClass}>Description</span>
                      <Textarea
                        className={fieldTextareaClass}
                        value={field.description ?? ''}
                        onChange={(event) => updateField(index, { description: event.target.value })}
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[140px_minmax(150px,160px)_minmax(180px,1fr)]">
                    <label className="flex items-end gap-3 pb-2 text-sm font-semibold text-neutral-700">
                      <Switch
                        className="shadow-none data-[state=checked]:bg-primary data-[state=unchecked]:bg-neutral-200"
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(index, { required: checked })}
                      />
                      Required
                    </label>

                    {field.fieldType === 'FILE_UPLOAD' ? (
                      <>
                        <label className="grid gap-1.5">
                          <span className={fieldLabelClass}>Allowed formats</span>
                          <Select
                            value={field.allowedFormatGroup ?? 'ALL'}
                            onValueChange={(value) => updateField(index, { allowedFormatGroup: value as DocumentCollectionAllowedFormatGroup })}
                          >
                            <SelectTrigger className={fieldSelectClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All</SelectItem>
                              <SelectItem value="IMAGE">Images</SelectItem>
                              <SelectItem value="FILE">PDF or Word</SelectItem>
                              <SelectItem value="VIDEO">Video</SelectItem>
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="grid gap-1.5">
                          <span className={fieldLabelClass}>Max size (MB)</span>
                          <Input
                            className={fieldControlClass}
                            type="number"
                            min={1}
                            value={bytesToMb(field.maxSizeBytes)}
                            onChange={(event) => updateField(index, { maxSizeBytes: mbToBytes(event.target.value) })}
                            placeholder="No limit"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the document collection template. Pending document requests may block deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive-bg text-destructive-text hover:bg-destructive-bg" onClick={() => void deleteCurrentTemplate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
