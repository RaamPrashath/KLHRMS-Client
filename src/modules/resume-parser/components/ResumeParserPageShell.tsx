'use client';

import { useRef, useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, Download, FileJson, Loader2, Upload, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fetchResumeParserHistoryAction,
  processResumeParserAction,
} from '@/modules/resume-parser/api/resumeParserServerActions';
import type {
  ResumeParserHistoryItem,
  ResumeParserTemplate,
} from '@/modules/resume-parser/types/resumeParserTypes';
import { cn } from '@/lib/utils';

const TEMPLATE_OPTIONS: Array<{ value: ResumeParserTemplate; label: string }> = [
  { value: 'default', label: 'Kovan Labs' },
  { value: 'ncs', label: 'NCS' },
  { value: 'rsc', label: 'RSC' },
];

export function ResumeParserPageShell({
  orgSlug,
  memberId,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [templateType, setTemplateType] = useState<ResumeParserTemplate>('default');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const historyQuery = useQuery({
    queryKey: ['resume-parser-history', orgSlug, memberId],
    queryFn: () => fetchResumeParserHistoryAction({ orgSlug, memberId, limit: 100 }),
    staleTime: 30_000,
  });

  const historyItems = historyQuery.data?.items ?? [];
  const showUploaderColumn = historyQuery.data?.scope === 'organization';

  function handleSubmit() {
    if (selectedFiles.length === 0) {
      toast.error('Upload at least one resume');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('resume_files', file));
    formData.append('template_type', templateType);

    startTransition(async () => {
      try {
        const response = await processResumeParserAction({ orgSlug, memberId, formData });
        const failures = response.processedFiles.filter((file) => file.status === 'failed').length;
        if (inputRef.current) inputRef.current.value = '';
        setSelectedFiles([]);
        await historyQuery.refetch();
        if (failures > 0) {
          toast.warning(`${failures} resume${failures === 1 ? '' : 's'} failed to process`);
        } else {
          toast.success('Resume processing complete');
        }
      } catch (error) {
        toast.error(readActionError(error));
      }
    });
  }

  return (
    <main className="min-h-full bg-canvas">
      <div className="flex min-h-full flex-1 flex-col gap-6">
        <div className="ml-7 mr-7 mt-7 flex items-start justify-between">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Resume Parser</h1>
        </div>

        <section className="mx-7 mb-7 flex flex-1 flex-col">
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col gap-5 border-b border-black/[0.04] px-8 py-6">
              <div className="flex gap-5">
                <div className="flex-[7]">
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const files = Array.from(e.dataTransfer.files).filter(
                        (f) => f.type === 'application/pdf' || f.name.endsWith('.doc') || f.name.endsWith('.docx'),
                      );
                      if (files.length > 0) setSelectedFiles([files[0]]);
                    }}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
                    className={cn(
                      'relative flex h-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                      isDragOver
                        ? 'border-action-blue bg-action-blue/5'
                        : selectedFiles.length > 0
                          ? 'border-neutral-300 bg-neutral-50'
                          : 'border-neutral-200 bg-canvas hover:border-neutral-300 hover:bg-neutral-50',
                    )}
                  >
                    {selectedFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); if (inputRef.current) inputRef.current.value = ''; }}
                        className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600"
                        aria-label="Clear selected files"
                      >
                        <X className="size-4" />
                      </button>
                    )}

                    {selectedFiles.length > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <p className="text-sm font-medium text-neutral-900">1 file selected</p>
                        <p className="max-w-full truncate text-xs text-neutral-600">{selectedFiles[0].name}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <p className="text-sm font-medium text-neutral-700">Drag & drop resumes here</p>
                        <p className="text-xs text-neutral-500">or click to browse &middot; PDF, DOC, DOCX</p>
                      </div>
                    )}

                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length > 0) setSelectedFiles([files[0]]);
                      }}
                      className="sr-only"
                    />
                  </div>
                </div>

                <div className="flex-[3] flex flex-col justify-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Select value={templateType} onValueChange={(value) => setTemplateType(value as ResumeParserTemplate)}>
                      <SelectTrigger id="template-type" className="h-10 w-full bg-canvas">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSubmit} disabled={isPending || selectedFiles.length === 0} className="h-10 w-full">
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {isPending ? 'Processing' : 'Process'}
                  </Button>
                </div>
              </div>
            </div>

            <HistoryTable
              items={historyItems}
              showUploaderColumn={showUploaderColumn}
              isLoading={historyQuery.isLoading}
              isError={historyQuery.isError}
              onRetry={() => void historyQuery.refetch()}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function HistoryTable({
  items,
  showUploaderColumn,
  isLoading,
  isError,
  onRetry,
}: {
  readonly items: ResumeParserHistoryItem[];
  readonly showUploaderColumn: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-surface py-16">
        <p className="text-sm font-medium text-neutral-900">Failed to load resume history</p>
        <p className="max-w-[250px] text-center text-xs text-neutral-500">There was a problem retrieving the data. Please try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-neutral-200 bg-transparent px-4 py-2 text-sm font-normal text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse bg-surface">
        {showUploaderColumn ? (
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
          </colgroup>
        ) : (
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[28%]" />
            <col className="w-[28%]" />
          </colgroup>
        )}
        <thead>
          <tr className="border-b border-black/[0.04] bg-canvas/50">
            {showUploaderColumn && (
              <th className="py-3 pl-6 text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">User Name</th>
            )}
            <th className={cn(
              'py-3 text-left text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
              showUploaderColumn ? 'pl-0' : 'pl-6',
            )}>File Name</th>
            <th className="py-3 text-center text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
            <th className="py-3 text-center text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Date Time</th>
            <th className="py-3 pr-6 text-right text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500">Downloads</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }, (_, index) => (
              <tr key={`resume-history-skeleton-${index}`} className="border-b border-black/4">
                {showUploaderColumn && <td className="py-3 pl-6"><div className="h-3 w-32 animate-pulse rounded bg-neutral-100" /></td>}
                <td className={cn('py-3', showUploaderColumn ? 'pl-0' : 'pl-6')}><div className="h-3 w-52 animate-pulse rounded bg-neutral-100" /></td>
                <td className="py-3"><div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-neutral-100" /></td>
                <td className="py-3"><div className="mx-auto h-3 w-28 animate-pulse rounded bg-neutral-100" /></td>
                <td className="py-3 pr-6"><div className="ml-auto h-8 w-28 animate-pulse rounded bg-neutral-100" /></td>
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={showUploaderColumn ? 5 : 4} className="py-16 text-center text-sm text-neutral-400">
                No resume history found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-b border-black/4 transition-colors hover:bg-canvas/60">
                {showUploaderColumn && (
                  <td className="py-3 pl-6 pr-4">
                    <span className="block truncate text-sm font-medium text-neutral-900" title={item.uploaderName ?? 'Unknown user'}>
                      {item.uploaderName ?? 'Unknown user'}
                    </span>
                  </td>
                )}
                <td className={cn('py-3 pr-4', showUploaderColumn ? 'pl-0' : 'pl-6')}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="block max-w-full truncate text-sm font-medium text-neutral-900" title={item.originalFilename}>
                      {truncateMiddle(item.originalFilename)}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-center">
                  <StatusPill status={item.status} />
                </td>
                <td className="py-3 text-center text-sm text-neutral-500">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="py-3 pr-6">
                  <div className="flex justify-end gap-2">
                    {item.status === 'success' ? (
                      <>
                        <DownloadButton href={item.jsonUrl} label="JSON" icon="json" />
                        <DownloadButton href={item.docxUrl} label="DOCX" icon="docx" />
                      </>
                    ) : (
                      <ErrorPopover messages={item.messages} />
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { readonly status: ResumeParserHistoryItem['status'] }) {
  const success = status === 'success';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        success ? 'bg-success-bg text-success-text' : 'bg-destructive-bg text-destructive-text',
      )}
    >
      {success ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
      {success ? 'Success' : 'Failed'}
    </span>
  );
}

function ErrorPopover({ messages }: { readonly messages: string[] }) {
  const message = messages.length > 0 ? messages.join(' ') : 'This resume failed to process.';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show error message"
          className="inline-flex size-8 items-center justify-center rounded-md border border-destructive/20 bg-destructive-bg text-destructive-text transition-colors hover:bg-destructive-bg/80"
        >
          <AlertCircle className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-2">
        <p className="text-sm font-medium text-neutral-900">Processing error</p>
        <p className="text-sm leading-5 text-neutral-500">{message}</p>
      </PopoverContent>
    </Popover>
  );
}

function DownloadButton({
  href,
  label,
  icon,
}: {
  readonly href: string | null;
  readonly label: string;
  readonly icon: 'json' | 'docx';
}) {
  const Icon = icon === 'json' ? FileJson : Download;
  if (!href) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Icon className="size-4" />
        {label}
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <Icon className="size-4" />
        {label}
      </a>
    </Button>
  );
}

function truncateMiddle(value: string, maxLength = 46): string {
  if (value.length <= maxLength) return value;
  const extensionIndex = value.lastIndexOf('.');
  const extension = extensionIndex > 0 ? value.slice(extensionIndex) : '';
  const base = extension ? value.slice(0, extensionIndex) : value;
  const headLength = Math.max(16, maxLength - extension.length - 12);
  return `${base.slice(0, headLength)}...${base.slice(-8)}${extension}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function readActionError(error: unknown): string {
  if (!(error instanceof Error)) return 'Failed to process resumes';
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // Fall through to raw message.
  }
  return error.message || 'Failed to process resumes';
}
