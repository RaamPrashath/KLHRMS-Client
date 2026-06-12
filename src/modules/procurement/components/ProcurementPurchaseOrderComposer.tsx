'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconTag,
  IconFileDescription,
  IconFileText,
  IconList,
  IconTruck,
  IconEye,
  IconArrowRight,
  IconSend,
  IconPlus,
  IconTrash,
  IconChevronRight
} from '@tabler/icons-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/modules/jobs/components/RichTextEditor';
import { useProcurementMutations } from '@/modules/procurement/hooks/useProcurementMutations';
import { useProcurementPurchaseOrderDraftQuery } from '@/modules/procurement/hooks/useProcurementQueries';
import type {
  ProcurementAdminRecipientOption,
  ProcurementPurchaseOrderDraftInput,
  ProcurementPurchaseOrderDraftResponse,
  ProcurementPurchaseOrderLineItemInput,
  ProcurementPurchaseOrderTemplateInput,
} from '@/modules/procurement/types/procurementTypes';

const sectionClassName =
  'rounded-lg border-[0.5px] border-border bg-white p-5 space-y-4';
const inputClassName =
  'h-10 rounded-lg border-[0.5px] border-[#d9dde3] bg-white text-[13px] text-[#111827] shadow-none placeholder:text-[#9ca3af] focus-visible:border-[--color-info] focus-visible:ring-[--color-info]/20';
const textareaClassName =
  'min-h-20 rounded-lg border-[0.5px] border-[#d9dde3] bg-white text-[13px] text-[#111827] shadow-none placeholder:text-[#9ca3af] focus-visible:border-[--color-info] focus-visible:ring-[--color-info]/20';

type PurchaseOrderComposerForm = {
  formatKey: 'STANDARD';
  template: ProcurementPurchaseOrderTemplateInput;
  document: ProcurementPurchaseOrderDraftInput;
  recipientMemberId: string | null;
  recipientEmail: string | null;
  message: string | null;
  sendToAdmin: boolean;
};

function readError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string };
      return parsed.message ?? fallback;
    } catch {
      return error.message || fallback;
    }
  }
  return fallback;
}

function base64ToBlob(base64: string, contentType = 'application/pdf') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function openPdf(base64: string, fileName: string) {
  const blob = base64ToBlob(base64);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildInitialForm(draft: ProcurementPurchaseOrderDraftResponse): PurchaseOrderComposerForm {
  return {
    formatKey: 'STANDARD',
    template: draft.template,
    document: draft.document,
    recipientMemberId: draft.adminRecipients[0]?.memberId ?? null,
    recipientEmail: draft.adminRecipients[0]?.email ?? null,
    message: null,
    sendToAdmin: false,
  };
}

function calculateLineTotal(item: ProcurementPurchaseOrderLineItemInput) {
  return Number((item.quantity * item.unitPrice * (1 + item.taxPercent / 100)).toFixed(2));
}

function updateLineItem(
  items: ProcurementPurchaseOrderLineItemInput[],
  index: number,
  patch: Partial<ProcurementPurchaseOrderLineItemInput>,
) {
  return items.map((item, currentIndex) => {
    if (currentIndex !== index) return item;
    const next = { ...item, ...patch };
    return { ...next, total: calculateLineTotal(next) };
  });
}

function Field({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="space-y-0.5">
        <Label className="text-[13px] font-medium text-[#374151]">{label}</Label>
        {description ? <p className="text-[11px] text-[#6e6e73]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border-[0.5px] border-border bg-[#f8f8fb] px-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-[#111827]">{label}</p>
        <p className="text-[11px] text-[#6e6e73]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function RichTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
}) {
  return (
    <Field label={label}>
      <div className="rounded-lg border-[0.5px] border-border overflow-hidden">
        <RichTextEditor
          content={value ?? ''}
          onChange={(next) => onChange(next || null)}
          placeholder={placeholder}
          minHeight={140}
        />
      </div>
    </Field>
  );
}

type StepType = 'branding' | 'document' | 'items' | 'delivery';

const nextStepMap: Record<StepType, StepType | null> = {
  branding: 'document',
  document: 'items',
  items: 'delivery',
  delivery: null,
};

const nextStepLabelMap: Record<StepType, string> = {
  branding: 'Document',
  document: 'Line items',
  items: 'Delivery',
  delivery: '',
};

const stepIndexMap: Record<StepType, number> = {
  branding: 0,
  document: 1,
  items: 2,
  delivery: 3,
};


export function ProcurementPurchaseOrderComposer({
  orgSlug,
  memberId,
  requisitionId,
}: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}) {
  const draftQuery = useProcurementPurchaseOrderDraftQuery(orgSlug, memberId, requisitionId);
  const mutations = useProcurementMutations(orgSlug, memberId);
  const [form, setForm] = useState<PurchaseOrderComposerForm | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepType>('branding');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const initialForm = useMemo(
    () => (draftQuery.data ? buildInitialForm(draftQuery.data) : null),
    [draftQuery.data],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentForm = (form ?? initialForm)!;

  if (draftQuery.isLoading || !currentForm) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#6b7280]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading purchase order workspace...
      </div>
    );
  }

  if (draftQuery.isError || !draftQuery.data) {
    return (
      <div className="rounded-lg border-[0.5px] border-[#f3d4d4] bg-white p-6 text-[#b3261e]">
        {draftQuery.error?.message ?? 'Failed to load purchase order draft.'}
      </div>
    );
  }

  const draft = draftQuery.data;

  function updateRecipient(memberIdValue: string) {
    const recipient = draft.adminRecipients.find((item) => item.memberId === memberIdValue);
    setForm({
      ...currentForm,
      recipientMemberId: memberIdValue,
      recipientEmail: recipient?.email ?? null,
    });
  }

  async function handlePreview() {
    try {
      const response = await mutations.previewPurchaseOrder.mutateAsync({
        requisitionId,
        data: currentForm,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blob = base64ToBlob(response.base64, response.contentType);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
      toast.success('PDF preview refreshed');
    } catch (error) {
      toast.error(readError(error, 'Failed to render PDF preview'));
    }
  }

  async function handleIssuePurchaseOrder() {
    try {
      const response = await mutations.issuePurchaseOrder.mutateAsync({
        requisitionId,
        data: currentForm,
      });
      openPdf(response.pdf.base64, response.pdf.fileName);
      toast.success(`Purchase order ${response.poNumber} generated and downloaded`);
    } catch (error) {
      toast.error(readError(error, 'Failed to generate purchase order'));
    }
  }

  const navItems = [
    { id: 'branding' as const, label: 'Branding', icon: IconTag },
    { id: 'document' as const, label: 'Document', icon: IconFileText },
    { id: 'items' as const, label: 'Line items', icon: IconList },
    { id: 'delivery' as const, label: 'Delivery', icon: IconTruck },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-canvas overflow-hidden">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-[0.5px] border-border bg-white px-8 py-4 shrink-0">
        <div className="flex items-center">
          <Breadcrumb>
            <BreadcrumbList className="text-[13px] font-medium sm:gap-1.5">
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="hover:text-foreground text-slate-500 transition-colors">
                  <Link href={`/${orgSlug}/procurement`}>Procurement</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="[&>svg]:size-3" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold text-slate-900">
                  {draft.requisition.requestLabel ?? draft.requisition.id}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePreview}
            disabled={mutations.previewPurchaseOrder.isPending}
            className="flex items-center justify-center gap-2 h-9 rounded-lg bg-transparent hover:bg-slate-50 text-[12px] font-medium text-slate-700 cursor-pointer"
          >
            {mutations.previewPurchaseOrder.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <IconEye className="w-3.5 h-3.5" />
            )}
            Preview
          </Button>
          <Button
            type="button"
            onClick={handleIssuePurchaseOrder}
            disabled={mutations.issuePurchaseOrder.isPending}
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-slate-950 text-white hover:bg-slate-800 text-[12px] font-bold shadow-none cursor-pointer"
          >
            {mutations.issuePurchaseOrder.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <IconSend className="w-3.5 h-3.5" />
            )}
            Generate
          </Button>
        </div>
      </header>

      {/* Horizontal Stepper Progress Bar */}
      <div className="bg-white border-b border-[0.5px] border-border py-5 px-8 flex justify-center shrink-0">
        <div className="flex items-center w-full max-w-xl">
          {navItems.map((item, index) => {
            const isActive = activeStep === item.id;
            const isCompleted = index < stepIndexMap[activeStep];
            const isLineCompleted = isCompleted;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.id}>
                {/* Step Circle & Label */}
                <div className="flex flex-col items-center relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveStep(item.id)}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
                      isActive
                        ? "bg-[--color-info-bg] border-2 border-[--color-info] text-[--color-info-text]"
                        : "bg-[#f3f4f6] border border-border text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>
                  <span
                    className={cn(
                      "text-[11px] font-medium mt-1.5 whitespace-nowrap",
                      isActive ? "text-[--color-info-text] font-semibold" : "text-slate-400"
                    )}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < navItems.length - 1 && (
                  <div className="flex-1 h-[2px] -mt-5 mx-[-16px] bg-border relative z-0">
                    <div
                      className={cn(
                        "absolute top-0 left-0 h-full transition-all duration-300",
                        isLineCompleted ? "w-full bg-[--color-info]" : "w-0"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto h-full bg-canvas">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          {/* Step 1: Branding & Content */}
          {activeStep === 'branding' && (
            <div className="space-y-6">
              <section className={sectionClassName}>
                <h2 className="text-[16px] font-bold text-foreground">Branding & Layout</h2>
                <div className="grid gap-3.5 md:grid-cols-2">
                  <Field label="Template name">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.name}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, name: event.target.value } })}
                    />
                  </Field>
                  <Field label="Page size">
                    <Select
                      value={currentForm.template.pageSize}
                      onValueChange={(value: 'A4' | 'LETTER') => setForm({ ...currentForm, template: { ...currentForm.template, pageSize: value } })}
                    >
                      <SelectTrigger className={inputClassName}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="LETTER">Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Display name">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.displayName}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, displayName: event.target.value } } })}
                    />
                  </Field>
                  <Field label="Legal name">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.name}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, name: event.target.value } } })}
                    />
                  </Field>
                  <Field label="Logo URL">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.logoUrl ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, logoUrl: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Tax ID">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.taxId ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, taxId: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.contactEmail ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, contactEmail: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.company.contactPhone ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, contactPhone: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Address" className="md:col-span-2">
                    <Textarea
                      className={textareaClassName}
                      value={currentForm.template.company.address ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, address: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Header title">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.headerTitle}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, headerTitle: event.target.value } })}
                    />
                  </Field>
                  <Field label="Header subtitle">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.headerSubtitle ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, headerSubtitle: event.target.value || null } })}
                    />
                  </Field>
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[16px] font-bold text-foreground">Template Content</h2>
                <div className="grid gap-5">
                  <RichTextField
                    label="Header intro"
                    value={currentForm.template.headerRichText}
                    onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, headerRichText: value } })}
                    placeholder="Add a short branded introduction above the purchase order details."
                  />
                  <RichTextField
                    label="Default payment terms"
                    value={currentForm.template.defaultPaymentTermsHtml}
                    onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultPaymentTermsHtml: value } })}
                    placeholder="Define reusable payment instructions for every purchase order."
                  />
                  <RichTextField
                    label="Default notes"
                    value={currentForm.template.defaultNotesHtml}
                    onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultNotesHtml: value } })}
                    placeholder="Add default operational notes."
                  />
                  <RichTextField
                    label="Default terms"
                    value={currentForm.template.defaultTermsHtml}
                    onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultTermsHtml: value } })}
                    placeholder="List your standard purchase order terms."
                  />
                  <RichTextField
                    label="Footer text"
                    value={currentForm.template.footerRichText}
                    onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, footerRichText: value } })}
                    placeholder="Optional footer copy repeated at the bottom of generated PDFs."
                  />
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[16px] font-bold text-foreground">Visibility & Signature</h2>
                <div className="grid gap-3.5 md:grid-cols-2">
                  <ToggleField
                    label="Show logo"
                    description="Render tenant branding at the top of the PDF."
                    checked={currentForm.template.visibility.showLogo}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showLogo: checked } } })}
                  />
                  <ToggleField
                    label="Vendor contacts"
                    description="Include vendor contact person, email, phone, and tax info."
                    checked={currentForm.template.visibility.showVendorContact}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showVendorContact: checked } } })}
                  />
                  <ToggleField
                    label="Vendor address"
                    description="Display the vendor postal address block."
                    checked={currentForm.template.visibility.showVendorAddress}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showVendorAddress: checked } } })}
                  />
                  <ToggleField
                    label="Billing address"
                    description="Show a dedicated billing address field in the PDF."
                    checked={currentForm.template.visibility.showBillingAddress}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showBillingAddress: checked } } })}
                  />
                  <ToggleField
                    label="Shipping address"
                    description="Show the shipping destination block in the PDF."
                    checked={currentForm.template.visibility.showShippingAddress}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showShippingAddress: checked } } })}
                  />
                  <ToggleField
                    label="Subject"
                    description="Show the subject block above the notes and terms sections."
                    checked={currentForm.template.visibility.showSubject}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showSubject: checked } } })}
                  />
                  <ToggleField
                    label="Payment terms"
                    description="Include payment terms in the generated PDF when they are filled in."
                    checked={currentForm.template.visibility.showPaymentTerms}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showPaymentTerms: checked } } })}
                  />
                  <ToggleField
                    label="Notes"
                    description="Control whether the notes section appears in the final PDF."
                    checked={currentForm.template.visibility.showNotes}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showNotes: checked } } })}
                  />
                  <ToggleField
                    label="Terms"
                    description="Show or hide the terms and conditions section."
                    checked={currentForm.template.visibility.showTerms}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showTerms: checked } } })}
                  />
                  <ToggleField
                    label="Footer"
                    description="Render footer copy and page numbering at the bottom of each page."
                    checked={currentForm.template.visibility.showFooter}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showFooter: checked } } })}
                  />
                  <ToggleField
                    label="Signature block"
                    description="Render signatory details and optional signature image."
                    checked={currentForm.template.visibility.showSignature}
                    onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showSignature: checked } } })}
                  />
                </div>
                <div className="mt-5 grid gap-3.5 md:grid-cols-2">
                  <Field label="Signatory name">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.signatory.name ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, name: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Signatory title">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.signatory.title ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, title: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Signature Image URL" className="md:col-span-2">
                    <Input
                      className={inputClassName}
                      value={currentForm.template.signatory.signatureImageUrl ?? ''}
                      onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, signatureImageUrl: event.target.value || null } } })}
                    />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {/* Step 2: Document */}
          {activeStep === 'document' && (
            <div className="space-y-6">
              <section className={sectionClassName}>
                <h2 className="text-[16px] font-bold text-foreground">Document Details</h2>
                <div className="grid gap-3.5 md:grid-cols-2">
                  <Field label="Vendor name">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.vendor.name}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, name: event.target.value } } } })}
                    />
                  </Field>
                  <Field label="Contact person">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.vendor.contactPerson ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, contactPerson: event.target.value || null } } } })}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.vendor.email ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, email: event.target.value || null } } } })}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.vendor.phone ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, phone: event.target.value || null } } } })}
                    />
                  </Field>
                  <Field label="Tax ID">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.vendor.taxId ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, taxId: event.target.value || null } } } })}
                    />
                  </Field>
                  <Field label="Currency">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.currency}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, currency: event.target.value.toUpperCase() } } })}
                    />
                  </Field>
                  <Field label="Vendor address" className="md:col-span-2">
                    <Textarea
                      className={textareaClassName}
                      value={currentForm.document.document.vendor.address ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, address: event.target.value || null } } } })}
                    />
                  </Field>
                  <Field label="Purchase order date">
                    <Input
                      type="date"
                      className={inputClassName}
                      value={currentForm.document.document.purchaseOrderDate}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, purchaseOrderDate: event.target.value } } })}
                    />
                  </Field>
                  <Field label="Delivery date">
                    <Input
                      type="date"
                      className={inputClassName}
                      value={currentForm.document.document.deliveryDate ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, deliveryDate: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Subject" className="md:col-span-2">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.subject ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, subject: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Billing address" className="md:col-span-2">
                    <Textarea
                      className={textareaClassName}
                      value={currentForm.document.document.billingAddress ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, billingAddress: event.target.value || null } } })}
                    />
                  </Field>
                  <Field label="Shipping address" className="md:col-span-2">
                    <Textarea
                      className={textareaClassName}
                      value={currentForm.document.document.shippingAddress ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, shippingAddress: event.target.value || null } } })}
                  />
                  </Field>
                  <Field label="Shipping method" className="md:col-span-2">
                    <Input
                      className={inputClassName}
                      value={currentForm.document.document.shippingMethod ?? ''}
                      onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, shippingMethod: event.target.value || null } } })}
                    />
                  </Field>
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[16px] font-bold text-foreground">Document Rich Text</h2>
                <div className="mt-4 grid gap-5">
                  <RichTextField
                    label="Payment terms"
                    value={currentForm.document.document.paymentTermsHtml}
                    onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, paymentTermsHtml: value } } })}
                    placeholder="Document-specific payment terms."
                  />
                  <RichTextField
                    label="Notes"
                    value={currentForm.document.document.notesHtml}
                    onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, notesHtml: value } } })}
                    placeholder="Finance notes, sourcing context, or delivery instructions."
                  />
                  <RichTextField
                    label="Terms"
                    value={currentForm.document.document.termsHtml}
                    onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, termsHtml: value } } })}
                    placeholder="Document-specific terms and conditions."
                  />
                  <RichTextField
                    label="Footer notes"
                    value={currentForm.document.document.footerNotesHtml}
                    onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, footerNotesHtml: value } } })}
                    placeholder="Optional notes repeated at the bottom of the PDF."
                  />
                </div>
              </section>
            </div>
          )}

          {/* Step 3: Line Items */}
          {activeStep === 'items' && (
            <section className={sectionClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-bold text-foreground">Line Items</h2>
                  <p className="mt-1 text-[11px] text-[#6e6e73]">
                    Multi-row purchase orders are supported in v1, and the backend PDF renderer paginates long tables.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-lg h-9 text-[12px] border-[0.5px]"
                  onClick={() => setForm({
                    ...currentForm,
                    document: {
                      ...currentForm.document,
                      lineItems: [
                        ...currentForm.document.lineItems,
                        { description: '', sku: null, quantity: 1, unitPrice: 0, taxPercent: 0, total: 0 },
                      ],
                    },
                  })}
                >
                  <IconPlus className="mr-1.5 w-4 h-4" />
                  Add item
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                {currentForm.document.lineItems.map((item, index) => (
                  <div key={`line-item-${index}`} className="rounded-lg border-[0.5px] border-border bg-[#f8f8fb] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#111827]">Item {index + 1}</p>
                      {currentForm.document.lineItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...currentForm,
                            document: {
                              ...currentForm.document,
                              lineItems: currentForm.document.lineItems.filter((_, currentIndex) => currentIndex !== index),
                            },
                          })}
                          className="inline-flex items-center gap-1 rounded-lg border-[0.5px] border-[#f5c2c2] px-2.5 py-1 text-[11px] font-medium text-[#b3261e] bg-white hover:bg-[#fff1f2] transition cursor-pointer"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3.5 md:grid-cols-2">
                      <Field label="Description" className="md:col-span-2">
                        <Textarea
                          className={textareaClassName}
                          value={item.description}
                          onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { description: event.target.value }) } })}
                        />
                      </Field>
                      <Field label="SKU / Code">
                        <Input
                          className={inputClassName}
                          value={item.sku ?? ''}
                          onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { sku: event.target.value || null }) } })}
                        />
                      </Field>
                      <Field label="Quantity">
                        <Input
                          type="number"
                          min={1}
                          className={inputClassName}
                          value={item.quantity}
                          onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { quantity: Number(event.target.value || 1) }) } })}
                        />
                      </Field>
                      <Field label="Unit price">
                        <Input
                          type="number"
                          min={0}
                          className={inputClassName}
                          value={item.unitPrice}
                          onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { unitPrice: Number(event.target.value || 0) }) } })}
                        />
                      </Field>
                      <Field label="Tax percent">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className={inputClassName}
                          value={item.taxPercent}
                          onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { taxPercent: Number(event.target.value || 0) }) } })}
                        />
                      </Field>
                      <Field label="Auto total">
                        <Input className={inputClassName} value={item.total.toFixed(2)} readOnly />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Step 4: Delivery */}
          {activeStep === 'delivery' && (
            <section className={sectionClassName}>
              <h2 className="text-[16px] font-bold text-foreground">Recipient & Delivery</h2>
              <div className="grid gap-3.5 md:grid-cols-2">
                <ToggleField
                  label="Email an admin recipient"
                  description="Send the final issued PDF to an approved admin contact after generation."
                  checked={currentForm.sendToAdmin}
                  onCheckedChange={(checked) => setForm({ ...currentForm, sendToAdmin: checked })}
                />
                <div className="rounded-lg border-[0.5px] border-[#e5e7eb] bg-[#f8f8fb] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#111827]">Email configuration</p>
                  <p className="mt-1 text-[11px] text-[#6e6e73]">
                    {draft.emailConfigured ? 'Server email delivery is configured.' : 'Server email delivery is not configured yet.'}
                  </p>
                </div>
                <Field label="Admin recipient">
                  <Select
                    value={currentForm.recipientMemberId ?? undefined}
                    onValueChange={updateRecipient}
                  >
                    <SelectTrigger className={inputClassName}><SelectValue placeholder="Select recipient" /></SelectTrigger>
                    <SelectContent>
                      {draft.adminRecipients.map((recipient: ProcurementAdminRecipientOption) => (
                        <SelectItem key={recipient.memberId} value={recipient.memberId}>
                          {recipient.name} - {recipient.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Finance note">
                  <Input
                    className={inputClassName}
                    value={currentForm.message ?? ''}
                    onChange={(event) => setForm({ ...currentForm, message: event.target.value || null })}
                  />
                </Field>
              </div>
            </section>
          )}

          {/* Wizard Next Button (rendered below steps 1-3) */}
          {nextStepMap[activeStep] && (
            <div className="flex justify-end mt-6">
              <Button
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[--color-info-text] hover:text-[--color-info-text]/85 hover:bg-[--color-info-bg]/60 rounded-lg h-9 px-4 transition cursor-pointer"
                onClick={() => setActiveStep(nextStepMap[activeStep]!)}
              >
                Next: {nextStepLabelMap[activeStep]}
                <IconArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* PDF Preview Modal Overlay */}
      {isPreviewOpen && previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-lg border-[0.5px] border-border w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[0.5px] border-border flex items-center justify-between bg-white shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Purchase Order Preview</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg h-8 px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 min-h-0 bg-[#f5f5f7]">
              <iframe
                title="Purchase order PDF preview"
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
