'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useDocumentCollectionPublic, useSubmitDocumentCollectionPublic } from '@/modules/document-collection/hooks/useDocumentCollection';
import type { DocumentCollectionPublicTemplate } from '@/modules/document-collection/types/documentCollectionTypes';

interface DocumentCollectionSubmissionFormProps {
  readonly token: string;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function extension(fileName: string): string {
  return fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : '';
}

function matchesFormat(file: File, group: string): boolean {
  if (group === 'ALL') return true;
  const ext = extension(file.name);
  if (group === 'IMAGE') return IMAGE_EXTENSIONS.has(ext);
  if (group === 'FILE') return FILE_EXTENSIONS.has(ext);
  if (group === 'VIDEO') return VIDEO_EXTENSIONS.has(ext);
  return true;
}

function acceptForGroup(group: string): string {
  if (group === 'IMAGE') return 'image/*';
  if (group === 'VIDEO') return 'video/*';
  if (group === 'FILE') return '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return '';
}

function formatBytes(value: number | null): string {
  if (!value) return 'No maximum size';
  const mb = value / 1024 / 1024;
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB max`;
}

function FieldUpload({
  field,
  file,
  onFileChange,
}: {
  readonly field: DocumentCollectionPublicTemplate['fields'][number];
  readonly file: File | null;
  readonly onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {field.name}{field.required ? <span className="text-destructive-text"> *</span> : null}
      </label>
      {field.description ? <p className="mb-2 text-xs text-neutral-500">{field.description}</p> : null}
      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          file ? 'border-success-text bg-success-bg/10' : 'border-neutral-200 bg-surface hover:border-primary',
        )}
      >
        {file ? (
          <>
            <CheckCircle2 className="size-8 text-success-text" />
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900">{file.name}</p>
              <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive-text"
              onClick={(event) => {
                event.stopPropagation();
                onFileChange(null);
              }}
            >
              <X className="size-3.5" />
              Remove
            </Button>
          </>
        ) : (
          <>
            <CloudUpload className="size-8 text-neutral-300" />
            <p className="mt-1 text-sm font-medium text-neutral-700">Upload file</p>
            <p className="text-xs text-neutral-400">{field.allowedFormatGroup} - {formatBytes(field.maxSizeBytes)}</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptForGroup(field.allowedFormatGroup)}
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileChange(nextFile);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function DocumentCollectionSubmissionForm({ token }: DocumentCollectionSubmissionFormProps) {
  const publicQuery = useDocumentCollectionPublic(token);
  const submitMutation = useSubmitDocumentCollectionPublic(token);
  const collection = publicQuery.data;
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitted, setSubmitted] = useState(false);

  if (publicQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center  p-4">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 text-sm text-neutral-500 shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading...
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen items-center justify-center  p-4">
        <div className="max-w-md rounded-xl border border-neutral-100 bg-surface p-8 text-center shadow-sm">
          <FileText className="mx-auto mb-4 size-12 text-neutral-300" />
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Invalid request</h1>
          <p className="text-sm text-neutral-500">This document collection link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (collection.status === 'SUBMITTED' || submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center  p-4">
        <div className="max-w-md rounded-xl bg-surface p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-success-text" />
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Submitted</h1>
          <p className="text-sm text-neutral-500">
            Thank you, {collection.candidateName}. Your document collection form has been submitted successfully.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!collection) return;
    const fields = [...collection.template.fields].sort((left, right) => left.order - right.order);
    for (const field of fields) {
      if (field.fieldType === 'FILE_UPLOAD') {
        const file = files[field.id] ?? null;
        if (field.required && !file) {
          toast.error(`${field.name} is required`);
          return;
        }
        if (file && !matchesFormat(file, field.allowedFormatGroup)) {
          toast.error(`${field.name} has an unsupported file type`);
          return;
        }
        if (file && field.maxSizeBytes && file.size > field.maxSizeBytes) {
          toast.error(`${field.name} exceeds the maximum file size`);
          return;
        }
      } else {
        const value = textValues[field.id]?.trim() ?? '';
        if (field.required && !value) {
          toast.error(`${field.name} is required`);
          return;
        }
      }
    }

    try {
      const answers = await Promise.all(fields.map(async (field) => {
        if (field.fieldType === 'FILE_UPLOAD') {
          const file = files[field.id] ?? null;
          if (!file) return { fieldId: field.id };
          return {
            fieldId: field.id,
            fileBase64: await readFileAsBase64(file),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          };
        }
        return {
          fieldId: field.id,
          value: textValues[field.id]?.trim() ?? '',
        };
      }));
      await submitMutation.mutateAsync({ answers });
      setSubmitted(true);
      toast.success('Document collection submitted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit document collection');
    }
  }

  const fields = [...collection.template.fields].sort((left, right) => left.order - right.order);

  return (
    <div className="min-h-screen  pt-16">
      <header>
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <span className="text-sm font-semibold text-neutral-900">{collection.organizationName}</span>
          <span className="mx-2 text-neutral-300">/</span>
          <span className="text-sm text-neutral-500">{collection.jobTitle}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-neutral-900">{collection.template.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Hello {collection.candidateName}, please complete the requested fields.
          </p>
          {collection.template.description ? (
            <p className="mt-3 rounded-lg border border-neutral-100 bg-surface p-3 text-sm text-neutral-500">
              {collection.template.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          {fields.map((field) => {
            if (field.fieldType === 'FILE_UPLOAD') {
              return (
                <FieldUpload
                  key={field.id}
                  field={field}
                  file={files[field.id] ?? null}
                  onFileChange={(file) => setFiles((current) => ({ ...current, [field.id]: file }))}
                />
              );
            }
            if (field.fieldType === 'LONG_TEXT') {
              return (
                <label key={field.id} className="grid gap-1.5">
                  <span className="text-sm font-medium text-neutral-700">{field.name}{field.required ? <span className="text-destructive-text"> *</span> : null}</span>
                  {field.description ? <span className="text-xs text-neutral-500">{field.description}</span> : null}
                  <Textarea value={textValues[field.id] ?? ''} onChange={(event) => setTextValues((current) => ({ ...current, [field.id]: event.target.value }))} rows={4} />
                </label>
              );
            }
            return (
              <label key={field.id} className="grid gap-1.5">
                <span className="text-sm font-medium text-neutral-700">{field.name}{field.required ? <span className="text-destructive-text"> *</span> : null}</span>
                {field.description ? <span className="text-xs text-neutral-500">{field.description}</span> : null}
                <Input
                  type={field.fieldType === 'DATE' ? 'date' : 'text'}
                  value={textValues[field.id] ?? ''}
                  onChange={(event) => setTextValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="button" className="bg-primary hover:bg-primary-hover" disabled={submitMutation.isPending} onClick={() => void handleSubmit()}>
            {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      </main>
    </div>
  );
}
