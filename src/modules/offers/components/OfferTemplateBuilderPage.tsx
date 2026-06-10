'use client';

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ChevronLeft,
  Copy,
  FileImage,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { cn } from '@/lib/utils';
import { OfferRichTextEditor, OFFER_VARIABLE_TOKENS } from '@/modules/offers/components/OfferRichTextEditor';
import { OfferTemplatePreview } from '@/modules/offers/components/OfferTemplatePreview';
import {
  useCopyOfferTemplate,
  useCreateOfferTemplate,
  useDeleteOfferTemplate,
  useOfferTemplate,
  useUpdateOfferTemplate,
  useUpsertOfferTemplateSection,
} from '@/modules/offers/hooks/useOfferTemplates';
import { escapeHtml, findUnknownOfferTokens } from '@/modules/offers/utils/offerTemplateRender';
import type {
  OfferTemplate,
  OfferTemplateCategory,
  OfferTemplateSection,
} from '@/modules/offers/types/offerTypes';

interface OfferTemplateBuilderPageProps {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly templateId?: string | null;
  readonly mode: 'new' | 'edit';
}

interface SignatureSlot {
  id: string;
  imageUrl: string;
  name: string;
  role: string;
}

interface TemplateDraft {
  name: string;
  logoUrl: string;
  headerTitle: string;
  headerDate: string;
  headerLocation: string;
  bodyHtml: string;
  bodyJson: Record<string, unknown>;
  signatures: SignatureSlot[];
  addressHtml: string;
  addressJson: Record<string, unknown>;
  websiteUrl: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string;
}

const DEFAULT_BODY = `Dear {{candidate.firstName}} {{candidate.lastName}},

We are pleased to extend this offer letter to you.

Please review the details and respond using the offer links provided in the email.`;
const DEFAULT_BODY_HTML = paragraphMarkdownToHtml(DEFAULT_BODY);
const DEFAULT_ADDRESS_HTML = '<p>Kovan Technology Labs India Private Limited</p><p>64 - Sri Lakshmi Nagar</p><p>Peelamedu</p><p>Coimbatore</p><p>Tamil Nadu, India - 641 004</p>';
const OFFER_ASSET_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_OFFER_BUCKET || 'offer-letter';
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);

function readActionError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : fallback;
  } catch {
    return error.message || fallback;
  }
}

function todayForInput(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
}

function formatDisplayDate(value: string): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).replaceAll(' ', '-');
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

function paragraphMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    html.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    if (trimmed.startsWith('### ')) {
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      html.push(`<h2>${escapeHtml(trimmed.slice(2))}</h2>`);
    } else {
      html.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }
  flushList();
  return html.join('');
}

function isTemporaryImageUrl(value: string): boolean {
  return value.startsWith('data:') || value.startsWith('blob:');
}

function persistedImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || isTemporaryImageUrl(trimmed)) return null;
  return trimmed;
}

function sanitizeStorageFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase public environment variables are not configured');
  }

  return createClient(url, key);
}

async function uploadOfferAssetToSupabase(params: {
  file: File;
  orgSlug: string;
  templateId: string;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const fileExtension = params.file.name.split('.').pop()?.toLowerCase() || params.file.type.split('/').pop()?.toLowerCase() || 'png';
  const extension = ALLOWED_IMAGE_EXTENSIONS.has(fileExtension) ? fileExtension : 'png';
  const safeName = sanitizeStorageFileName(params.file.name || `offer-asset.${extension}`);
  const storagePath = [
    params.orgSlug,
    'offers',
    'templates',
    params.templateId,
    'assets',
    `${crypto.randomUUID()}-${safeName}`,
  ].join('/');

  const uploadOptions = {
    cacheControl: '3600',
    contentType: params.file.type || `image/${extension}`,
    upsert: false,
  };

  let { error } = await supabase.storage
    .from(OFFER_ASSET_BUCKET)
    .upload(storagePath, params.file, uploadOptions);

  if (isMissingBucketError(error)) {
    await ensureOfferAssetBucket(supabase);
    const retry = await supabase.storage
      .from(OFFER_ASSET_BUCKET)
      .upload(storagePath, params.file, uploadOptions);
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(OFFER_ASSET_BUCKET).getPublicUrl(storagePath);
  if (!data.publicUrl) {
    throw new Error('Failed to generate offer asset URL');
  }

  return data.publicUrl;
}

function isMissingBucketError(error: { message?: string; statusCode?: string | number } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return message.includes('bucket not found') || message.includes('not found') || error.statusCode === '404';
}

async function ensureOfferAssetBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(OFFER_ASSET_BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  });

  if (!error || error.message.toLowerCase().includes('already exists')) return;

  throw new Error(
    `Supabase bucket "${OFFER_ASSET_BUCKET}" does not exist and could not be created with the public client key: ${error.message}`,
  );
}

function buildHeaderHtml(draft: TemplateDraft, options: { includeTemporaryImages?: boolean } = {}): string {
  const logoUrl = options.includeTemporaryImages ? draft.logoUrl : persistedImageUrl(draft.logoUrl);
  const logo = logoUrl
    ? `<img class="offer-letter-logo" src="${escapeHtml(logoUrl)}" alt="" />`
    : '';
  return `
    <div class="offer-letter-header">
      <div class="offer-letter-header-brand">
        ${logo}
      </div>
      <div class="offer-letter-header-meta">
        <p>${escapeHtml(formatDisplayDate(draft.headerDate))}</p>
        <p>${escapeHtml(draft.headerLocation)}</p>
      </div>
      <h1>${escapeHtml(draft.headerTitle)}</h1>
    </div>
  `;
}

function buildFooterHtml(draft: TemplateDraft, options: { includeTemporaryImages?: boolean } = {}): string | null {
  const signatureHtml = draft.signatures
    .filter((signature) => signature.imageUrl || signature.name || signature.role)
    .map((signature) => {
      const imageUrl = options.includeTemporaryImages ? signature.imageUrl : persistedImageUrl(signature.imageUrl);
      return `
      <div class="offer-signature-slot">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" />` : ''}
        ${signature.name ? `<p class="offer-signature-name">(${escapeHtml(signature.name)})</p>` : ''}
        ${signature.role ? `<p>${escapeHtml(signature.role)}</p>` : ''}
      </div>
    `;
    })
    .join('');
  const website = draft.websiteUrl.trim();
  return `
    <div class="offer-letter-footer">
      ${signatureHtml}
      <div class="offer-footer-address">${draft.addressHtml}</div>
      ${website ? `<a class="offer-footer-website" href="${escapeHtml(website)}">${escapeHtml(website.replace(/^https?:\/\//, ''))}</a>` : ''}
    </div>
  `;
}

function draftSignature(draft: TemplateDraft): string {
  return JSON.stringify(draft);
}

function findSection(sections: OfferTemplateSection[], key: string): OfferTemplateSection | null {
  return sections.find((section) => section.sectionKey === key) ?? null;
}

function groupedVariableTokens() {
  const groups = new Map<string, typeof OFFER_VARIABLE_TOKENS>();
  for (const token of OFFER_VARIABLE_TOKENS) {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
  }
  return Array.from(groups.entries()).map(([group, tokens]) => ({ group, tokens }));
}

function insertTokenAtSelection(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string,
): { nextValue: string; cursor: number } {
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? start;
  const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`;
  return { nextValue, cursor: start + token.length };
}

function insertAndRestoreCursor(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string,
  onValue: (nextValue: string) => void,
) {
  const { nextValue, cursor } = insertTokenAtSelection(element, value, token);
  onValue(nextValue);
  window.requestAnimationFrame(() => {
    element?.focus();
    element?.setSelectionRange(cursor, cursor);
  });
}

function parseFooterHtml(footerHtml: string | null): { addressHtml: string; websiteUrl: string } {
  if (!footerHtml) return { addressHtml: '', websiteUrl: '' };
  const addressMatch = footerHtml.match(/<div class="offer-footer-address">([\s\S]*?)<\/div>/);
  const addressHtml = addressMatch ? addressMatch[1].trim() : '';
  const websiteMatch = footerHtml.match(/<a class="offer-footer-website" href="([^"]*)"/);
  const websiteUrl = websiteMatch ? websiteMatch[1] : '';
  return { addressHtml, websiteUrl };
}

function draftFromTemplate(template: OfferTemplate): TemplateDraft {
  const body = findSection(template.sections, 'opening') ?? template.sections[0] ?? null;
  const logoUrl = template.logoUrl && !isTemporaryImageUrl(template.logoUrl) ? template.logoUrl : '';
  const signatureUrl = template.signatureUrl && !isTemporaryImageUrl(template.signatureUrl) ? template.signatureUrl : '';
  const { addressHtml: parsedAddressHtml, websiteUrl: parsedWebsiteUrl } = parseFooterHtml(template.footerHtml);
  return {
    name: template.name,
    logoUrl,
    headerTitle: stripHtml(findSection(template.sections, 'title')?.html) || 'Internship Offer Letter',
    headerDate: todayForInput(),
    headerLocation: 'Coimbatore',
    bodyHtml: body?.html || DEFAULT_BODY_HTML,
    bodyJson: body?.tiptapJson ?? {},
    signatures: [
      {
        id: 'signature-1',
        imageUrl: signatureUrl,
        name: template.signatoryName ?? '',
        role: template.signatoryTitle ?? '',
      },
    ],
    addressHtml: parsedAddressHtml || DEFAULT_ADDRESS_HTML,
    addressJson: {},
    websiteUrl: (template.websiteUrl ?? parsedWebsiteUrl) || 'http://www.kovanlabs.com',
    status: template.status === 'ACTIVE' || template.status === 'ARCHIVED' ? template.status : 'DRAFT',
  };
}

function previewTemplateFromDraft(template: OfferTemplate, categoryId: string, draft: TemplateDraft): OfferTemplate {
  const headerHtml = buildHeaderHtml(draft, { includeTemporaryImages: true });
  const footerHtml = buildFooterHtml(draft, { includeTemporaryImages: true });
  return {
    ...template,
    name: draft.name,
    logoUrl: draft.logoUrl || null,
    signatureUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    footerHtml,
    sections: template.sections.map((section) => {
      if (section.categoryId !== categoryId) return section;
      if (section.sectionKey === 'metadata') {
        return { ...section, html: headerHtml, tiptapJson: {} };
      }
      if (section.sectionKey === 'opening') {
        return { ...section, sectionName: 'Body', html: draft.bodyHtml, tiptapJson: draft.bodyJson };
      }
      return { ...section, html: '', tiptapJson: {} };
    }),
  };
}

const pendingCreations = new Set<string>();

export function OfferTemplateBuilderPage({
  orgSlug,
  memberId,
  templateId: initialTemplateId = null,
  mode,
}: OfferTemplateBuilderPageProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);
  const [draft, setDraft] = useState<TemplateDraft>({
    name: 'Untitled offer template',
    logoUrl: '',
    headerTitle: 'Internship Offer Letter',
    headerDate: todayForInput(),
    headerLocation: 'Coimbatore',
    bodyHtml: DEFAULT_BODY_HTML,
    bodyJson: {},
    signatures: [{ id: 'signature-1', imageUrl: '', name: '', role: '' }],
    addressHtml: DEFAULT_ADDRESS_HTML,
    addressJson: {},
    websiteUrl: 'http://www.kovanlabs.com',
    status: 'DRAFT',
  });
  const [activeTab, setActiveTab] = useState<'header' | 'body' | 'footer'>('header');
  const [logoUploading, setLogoUploading] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [templateSave, setTemplateSave] = useState<SaveState>({ status: 'idle', message: 'Draft' });
  const [contentSave, setContentSave] = useState<SaveState>({ status: 'idle', message: 'Draft' });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createTemplate = useCreateOfferTemplate(orgSlug, memberId);
  const templateQuery = useOfferTemplate(orgSlug, memberId, templateId);
  const updateTemplate = useUpdateOfferTemplate(orgSlug, memberId, templateId);
  const copyTemplate = useCopyOfferTemplate(orgSlug, memberId);
  const deleteTemplate = useDeleteOfferTemplate(orgSlug, memberId);
  const createdRef = useRef(false);
  const hydratedTemplateIdRef = useRef<string | null>(null);
  const lastTemplateSignatureRef = useRef('');
  const lastHeaderSignatureRef = useRef('');
  const lastBodySignatureRef = useRef('');
  const updateTemplateMutateRef = useRef(updateTemplate.mutate);

  const template = templateQuery.data ?? null;
  const categories = useMemo(
    () => [...(template?.categories ?? [])].sort((left, right) => left.order - right.order),
    [template?.categories],
  );
  const activeCategory = categories[0] ?? null;
  const activeCategoryId = activeCategory?.id ?? null;
  const upsertSection = useUpsertOfferTemplateSection(orgSlug, memberId, templateId, activeCategoryId);
  const upsertSectionMutateRef = useRef(upsertSection.mutate);

  useEffect(() => {
    updateTemplateMutateRef.current = updateTemplate.mutate;
  }, [updateTemplate.mutate]);

  useEffect(() => {
    upsertSectionMutateRef.current = upsertSection.mutate;
  }, [upsertSection.mutate]);

  useEffect(() => {
    if (mode !== 'new' || createdRef.current) return;
    const creationKey = `${orgSlug}-${memberId}`;
    if (pendingCreations.has(creationKey)) return;
    pendingCreations.add(creationKey);
    createdRef.current = true;
    createTemplate.mutate(
      {
        name: 'Untitled offer template',
        status: 'DRAFT',
        categories: [{ name: 'General' }],
      },
      {
        onSuccess: (createdTemplate) => {
          pendingCreations.delete(creationKey);
          setTemplateId(createdTemplate.id);
          router.replace(`/${orgSlug}/offer/${createdTemplate.id}`);
        },
        onError: (error) => {
          pendingCreations.delete(creationKey);
          toast.error(readActionError(error, 'Failed to create template'));
        },
      },
    );
  }, [createTemplate, mode, orgSlug, router, memberId]);

  const serverDraft = useMemo(() => (template ? draftFromTemplate(template) : null), [template]);
  const serverDraftSignature = useMemo(() => (serverDraft ? draftSignature(serverDraft) : ''), [serverDraft]);

  useEffect(() => {
    if (template?.id && hydratedTemplateIdRef.current === template.id) return;
    if (!serverDraft || !serverDraftSignature) return;
    const timeoutId = window.setTimeout(() => {
      hydratedTemplateIdRef.current = template?.id ?? null;
      setDraft((current) => (draftSignature(current) === serverDraftSignature ? current : serverDraft));
      lastTemplateSignatureRef.current = JSON.stringify({
        name: serverDraft.name,
        logoUrl: serverDraft.logoUrl,
        signatureUrl: serverDraft.signatures[0]?.imageUrl ?? '',
        signatoryName: serverDraft.signatures[0]?.name ?? '',
        signatoryTitle: serverDraft.signatures[0]?.role ?? '',
        footerHtml: buildFooterHtml(serverDraft),
        websiteUrl: serverDraft.websiteUrl,
      });
      lastHeaderSignatureRef.current = buildHeaderHtml(serverDraft);
      lastBodySignatureRef.current = JSON.stringify({ html: serverDraft.bodyHtml, json: serverDraft.bodyJson });
      setTemplateSave({ status: 'saved', message: 'Saved' });
      setContentSave({ status: 'saved', message: 'Saved' });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [serverDraft, serverDraftSignature, template?.id]);

  const headerHtml = useMemo(() => buildHeaderHtml(draft), [draft]);
  const bodyHtml = draft.bodyHtml;
  const bodyJson = draft.bodyJson;
  const footerHtml = useMemo(() => buildFooterHtml(draft), [draft]);
  const previewTemplate = useMemo(
    () => (template && activeCategoryId ? previewTemplateFromDraft(template, activeCategoryId, draft) : null),
    [activeCategoryId, draft, template],
  );

  useEffect(() => {
    if (!templateId || !template) return;
    const primarySignature = draft.signatures[0];
    const signature = JSON.stringify({
      name: draft.name,
      logoUrl: persistedImageUrl(draft.logoUrl),
      signatureUrl: persistedImageUrl(primarySignature?.imageUrl ?? ''),
      signatoryName: primarySignature?.name ?? '',
      signatoryTitle: primarySignature?.role ?? '',
      footerHtml,
      websiteUrl: draft.websiteUrl,
    });
    if (signature === lastTemplateSignatureRef.current) return;

    setTemplateSave((current) => (
      current.status === 'saving' ? current : { status: 'saving', message: 'Saving' }
    ));
    const timeoutId = window.setTimeout(() => {
      updateTemplateMutateRef.current(
        {
          name: draft.name.trim() || 'Untitled offer template',
          logoUrl: persistedImageUrl(draft.logoUrl),
          signatureUrl: persistedImageUrl(primarySignature?.imageUrl ?? ''),
          signatoryName: primarySignature?.name.trim() || null,
          signatoryTitle: primarySignature?.role.trim() || null,
          footerHtml,
          websiteUrl: draft.websiteUrl.trim() || null,
        },
        {
          onSuccess: () => {
            lastTemplateSignatureRef.current = signature;
            setTemplateSave({ status: 'saved', message: 'Saved' });
          },
          onError: (error) => setTemplateSave({ status: 'error', message: readActionError(error, 'Autosave failed') }),
        },
      );
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [draft.logoUrl, draft.name, draft.signatures, footerHtml, draft.websiteUrl, template, templateId]);

  useEffect(() => {
    if (!templateId || !activeCategoryId) return;
    if (headerHtml === lastHeaderSignatureRef.current) return;

    setContentSave((current) => (
      current.status === 'saving' ? current : { status: 'saving', message: 'Saving' }
    ));
    const timeoutId = window.setTimeout(() => {
      upsertSectionMutateRef.current(
        {
          sectionKey: 'metadata',
          data: {
            sectionKey: 'metadata',
            sectionName: 'Header',
            order: 1,
            tiptapJson: {},
            html: headerHtml,
          },
        },
        {
          onSuccess: () => {
            lastHeaderSignatureRef.current = headerHtml;
            setContentSave({ status: 'saved', message: 'Saved' });
          },
          onError: (error) => setContentSave({ status: 'error', message: readActionError(error, 'Autosave failed') }),
        },
      );
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeCategoryId, headerHtml, templateId]);

  useEffect(() => {
    if (!templateId || !activeCategoryId) return;
    const bodySignature = JSON.stringify({ html: bodyHtml, json: bodyJson });
    if (bodySignature === lastBodySignatureRef.current) return;

    setContentSave((current) => (
      current.status === 'saving' ? current : { status: 'saving', message: 'Saving' }
    ));
    const timeoutId = window.setTimeout(() => {
      upsertSectionMutateRef.current(
        {
          sectionKey: 'opening',
          data: {
            sectionKey: 'opening',
            sectionName: 'Body',
            order: 2,
            tiptapJson: bodyJson,
            html: bodyHtml,
          },
        },
        {
          onSuccess: () => {
            lastBodySignatureRef.current = bodySignature;
            setContentSave({ status: 'saved', message: 'Saved' });
          },
          onError: (error) => setContentSave({ status: 'error', message: readActionError(error, 'Autosave failed') }),
        },
      );
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeCategoryId, bodyHtml, bodyJson, templateId]);

  const rawTemplateText = `${headerHtml}\n${bodyHtml}\n${footerHtml ?? ''}`;
  const missingVariables = ['{{candidate.firstName}}', '{{candidate.lastName}}'].filter((token) => !rawTemplateText.includes(token));
  const unknownTokens = findUnknownOfferTokens(rawTemplateText);

  function updateSignature(id: string, patch: Partial<SignatureSlot>) {
    setDraft((current) => ({
      ...current,
      signatures: current.signatures.map((signature) => (
        signature.id === id ? { ...signature, ...patch } : signature
      )),
    }));
  }

  function addSignature() {
    setDraft((current) => ({
      ...current,
      signatures: [
        ...current.signatures,
        { id: `signature-${crypto.randomUUID()}`, imageUrl: '', name: '', role: '' },
      ],
    }));
  }

  function removeSignature(id: string) {
    setDraft((current) => ({
      ...current,
      signatures: current.signatures.length <= 1
        ? current.signatures
        : current.signatures.filter((signature) => signature.id !== id),
    }));
  }

  async function handleImageFile(file: File | undefined, onValue: (value: string) => void) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (!templateId) {
      toast.error('Template is still being created');
      return;
    }
    setTemplateSave({ status: 'saving', message: 'Uploading image' });
    try {
      const publicUrl = await uploadOfferAssetToSupabase({
        file,
        orgSlug,
        templateId,
      });
      onValue(publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      setTemplateSave({ status: 'error', message: readActionError(error, 'Image upload failed') });
      toast.error(readActionError(error, 'Image upload failed'));
    }
  }

  async function copyCurrentTemplate() {
    if (!templateId) return;
    try {
      const copied = await copyTemplate.mutateAsync({ templateId, data: {} });
      toast.success('Template copied');
      router.push(`/${orgSlug}/offer/${copied.id}`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to copy template'));
    }
  }

  async function publishTemplate() {
    if (missingVariables.length > 0) {
      toast.error('Add required candidate first name and last name variables before publishing');
      return;
    }
    if (unknownTokens.length > 0) {
      toast.error('Remove unknown variables before publishing');
      return;
    }
    try {
      await updateTemplate.mutateAsync({ status: 'ACTIVE' });
      setDraft((current) => ({ ...current, status: 'ACTIVE' }));
      toast.success('Template published');
    } catch (error) {
      toast.error(readActionError(error, 'Failed to publish template'));
    }
  }

  async function deleteCurrentTemplate() {
    if (!templateId) return;
    try {
      await deleteTemplate.mutateAsync({ templateId });
      toast.success('Template deleted');
      router.push(`/${orgSlug}/candidates`);
    } catch (error) {
      toast.error(readActionError(error, 'Failed to delete template'));
    }
  }

  if (mode === 'new' && !templateId) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Creating template
        </div>
      </div>
    );
  }

  if (templateQuery.isLoading && !template) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6 text-sm text-neutral-500">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-surface px-4 py-3 shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading template
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-900">Offer template was not found.</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push(`/${orgSlug}/candidates`)}>
            Back to candidates
          </Button>
        </div>
      </div>
    );
  }

  const saveState = contentSave.status === 'saving' || templateSave.status === 'saving'
    ? { status: 'saving', message: 'Saving' }
    : contentSave.status === 'error'
      ? contentSave
      : templateSave.status === 'error'
        ? templateSave
        : { status: 'saved', message: 'Saved' };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-canvas">
      <header className="flex shrink-0 flex-col gap-3 border-b border-neutral-100 bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => router.back()}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h1 className="truncate text-lg font-semibold text-neutral-900">Offer template builder</h1>
              <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-500">
                {draft.status}
              </span>
            </div>
            <p className={cn('mt-0.5 text-xs', saveState.status === 'error' ? 'text-destructive-text' : 'text-neutral-500')}>
              {saveState.message}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-neutral-100 bg-neutral-50 p-1 lg:hidden">
            {(['edit', 'preview'] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={mobileView === view}
                className={cn(
                  'h-8 rounded-lg px-3 text-xs font-medium',
                  mobileView === view ? 'bg-surface text-primary shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-neutral-500',
                )}
                onClick={() => setMobileView(view)}
              >
                {view === 'edit' ? 'Edit' : 'Preview'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void copyCurrentTemplate()} disabled={copyTemplate.isPending}>
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary-hover" onClick={() => void publishTemplate()} disabled={updateTemplate.isPending}>
            <Save className="size-3.5" />
            Publish
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className={cn('min-h-0 overflow-y-auto border-r border-neutral-100 bg-canvas p-4 lg:block lg:p-6', mobileView === 'preview' && 'hidden')}>
          <div className="space-y-4">
            <label className="grid gap-1.5 rounded-xl border border-neutral-100 bg-surface p-4 text-[13px] font-medium text-neutral-700 shadow-sm">
              Template name
              <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>

            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'header' | 'body' | 'footer')} className="flex flex-col rounded-xl border border-neutral-100 bg-surface p-4 shadow-sm">
              <TabSlider
                modes={[
                  { mode: 'header', label: 'Header' },
                  { mode: 'body', label: 'Body' },
                  { mode: 'footer', label: 'Footer' },
                ]}
                activeMode={activeTab}
                onChange={setActiveTab}
              />

              <TabsContent value="header" className="mt-4 min-w-0 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1.5 text-[13px] font-medium text-neutral-700 md:col-span-2">
                    Logo
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input value={draft.logoUrl} onChange={(event) => setDraft((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://..." disabled={logoUploading} />
                      <label className={cn(
                        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-200 bg-surface px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50",
                        logoUploading && "pointer-events-none opacity-50"
                      )}>
                        {logoUploading ? (
                          <Loader2 className="size-4 animate-spin text-neutral-500" />
                        ) : (
                          <FileImage className="size-4" />
                        )}
                        {logoUploading ? 'Uploading...' : 'Upload'}
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/*"
                          disabled={logoUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setLogoUploading(true);
                              handleImageFile(file, (value) => {
                                setDraft((current) => ({ ...current, logoUrl: value }));
                              }).finally(() => setLogoUploading(false));
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700 md:col-span-2">
                    Heading
                    <VariableInput value={draft.headerTitle} onValueChange={(headerTitle) => setDraft((current) => ({ ...current, headerTitle }))} />
                  </label>
                  <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                    Date
                    <Input type="date" value={draft.headerDate} onChange={(event) => setDraft((current) => ({ ...current, headerDate: event.target.value }))} />
                  </label>
                  <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                    Location
                    <VariableInput value={draft.headerLocation} onValueChange={(headerLocation) => setDraft((current) => ({ ...current, headerLocation }))} />
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="body" className="mt-4 min-w-0">
                <div className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                  Body
                  <OfferRichTextEditor
                    contentHtml={draft.bodyHtml}
                    contentJson={draft.bodyJson}
                    minHeight={440}
                    placeholder="Write the offer letter body..."
                    onChange={(value) => setDraft((current) => ({
                      ...current,
                      bodyHtml: value.html,
                      bodyJson: value.json,
                    }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="footer" className="mt-4 min-w-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-neutral-900">Signatures</h2>
                    <Button variant="outline" size="sm" onClick={addSignature}>
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                  {draft.signatures.map((signature, index) => (
                    <div key={signature.id} className="min-w-0 rounded-lg border border-neutral-100 bg-canvas p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium text-neutral-500">Signature {index + 1}</p>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeSignature(signature.id)} disabled={draft.signatures.length <= 1} aria-label="Remove signature">
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-1.5 text-[13px] font-medium text-neutral-700 md:col-span-2">
                          Signature image
                          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                            <Input value={signature.imageUrl} onChange={(event) => updateSignature(signature.id, { imageUrl: event.target.value })} placeholder="https://..." />
                            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-200 bg-surface px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                              <FileImage className="size-4" />
                              Upload
                              <input
                                className="sr-only"
                                type="file"
                                accept="image/*"
                                onChange={(event) => void handleImageFile(event.target.files?.[0], (value) => updateSignature(signature.id, { imageUrl: value }))}
                              />
                            </label>
                          </div>
                        </div>
                        <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                          Name
                          <VariableInput value={signature.name} onValueChange={(name) => updateSignature(signature.id, { name })} />
                        </label>
                        <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                          Role
                          <VariableInput value={signature.role} onValueChange={(role) => updateSignature(signature.id, { role })} />
                        </label>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                  Address
                  <OfferRichTextEditor
                    contentHtml={draft.addressHtml}
                    contentJson={draft.addressJson}
                    minHeight={200}
                    placeholder="Enter the organization address..."
                    onChange={(value) => setDraft((current) => ({
                      ...current,
                      addressHtml: value.html,
                      addressJson: value.json,
                    }))}
                  />
                </div>
                <label className="grid gap-1.5 text-[13px] font-medium text-neutral-700">
                  Website link
                  <Input value={draft.websiteUrl} onChange={(event) => setDraft((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="http://www.kovanlabs.com" />
                </label>
              </TabsContent>
            </Tabs>

            {missingVariables.length > 0 || unknownTokens.length > 0 ? (
              <div className="rounded-lg border border-warning-bg bg-warning-bg p-3 text-xs text-warning-text">
                {missingVariables.length > 0 ? <p>Missing required variables: {missingVariables.join(', ')}</p> : null}
                {unknownTokens.length > 0 ? <p>Unknown variables: {unknownTokens.join(', ')}</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={cn('min-h-0 lg:block', mobileView === 'edit' && 'hidden')}>
          <OfferTemplatePreview
            template={previewTemplate}
            category={activeCategory as OfferTemplateCategory | null}
          />
        </section>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl bg-surface shadow-[var(--shadow-4)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This hard deletes the offer template and its categories. In-progress batches may block deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTemplate.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTemplate.isPending}
              onClick={(event) => {
                event.preventDefault();
                void deleteCurrentTemplate();
              }}
            >
              {deleteTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TabSlider<T extends string>({
  modes,
  activeMode,
  onChange,
}: {
  readonly modes: { mode: T; label: string }[];
  readonly activeMode: T;
  readonly onChange: (mode: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = modes.findIndex((m) => m.mode === activeMode);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeIdx, modes]);

  return (
    <div
      ref={containerRef}
      className="flex items-center self-stretch rounded-xl bg-neutral-50 p-1 border border-black/4 relative w-full shrink-0"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {modes.map(({ mode, label }, idx) => (
        <button
          key={mode}
          data-tab-index={idx}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={activeMode === mode}
          className={cn(
            'inline-flex items-center justify-center flex-1 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
            activeMode === mode
              ? 'text-primary'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function VariableInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Input>, 'onChange' | 'value'> & {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <VariableContextMenu
      onTokenSelect={(token) => insertAndRestoreCursor(ref.current, value, token, onValueChange)}
    >
      <Input
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </VariableContextMenu>
  );
}

function VariableContextMenu({
  children,
  onTokenSelect,
}: {
  readonly children: ReactNode;
  readonly onTokenSelect: (token: string) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Insert variable</ContextMenuLabel>
        {groupedVariableTokens().map((group) => (
          <ContextMenuSub key={group.group}>
            <ContextMenuSubTrigger>{group.group}</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {group.tokens.map((token) => (
                <ContextMenuItem key={token.token} onSelect={() => onTokenSelect(token.token)}>
                  {token.label}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
