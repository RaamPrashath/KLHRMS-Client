'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, Loader2, Plus, RefreshCcw, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
  'rounded-[28px] border border-[#e5e5ea] bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.04)] backdrop-blur';
const inputClassName =
  'h-11 rounded-2xl border-[#d9dde3] bg-white text-[14px] text-[#111827] shadow-none placeholder:text-[#9ca3af] focus-visible:border-[#0066cc] focus-visible:ring-[#0066cc]/20';
const textareaClassName =
  'min-h-24 rounded-2xl border-[#d9dde3] bg-white text-[14px] text-[#111827] shadow-none placeholder:text-[#9ca3af] focus-visible:border-[#0066cc] focus-visible:ring-[#0066cc]/20';

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
    <div className={cn('grid gap-2', className)}>
      <div className="space-y-0.5">
        <Label className="text-[13px] font-semibold text-[#374151]">{label}</Label>
        {description ? <p className="text-[12px] text-[#6e6e73]">{description}</p> : null}
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e5e5ea] bg-[#f8f8fb] px-4 py-3">
      <div>
        <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
        <p className="text-[12px] text-[#6e6e73]">{description}</p>
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
      <RichTextEditor
        content={value ?? ''}
        onChange={(next) => onChange(next || null)}
        placeholder={placeholder}
        minHeight={140}
      />
    </Field>
  );
}

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
      <div className="rounded-[28px] border border-[#f3d4d4] bg-white p-6 text-[#b3261e]">
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

  async function handleSaveTemplate() {
    try {
      await mutations.savePurchaseOrderTemplate.mutateAsync(currentForm.template);
      toast.success('Purchase order template saved');
    } catch (error) {
      toast.error(readError(error, 'Failed to save purchase order template'));
    }
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

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e5e7eb] pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/${orgSlug}/procurement`} className="text-[#0066cc]">
                      Procurement
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{draft.requisition.requestLabel ?? 'Purchase Order'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">
              {draft.requisition.requestLabel ?? 'Purchase Order'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-full border-[#d7dbe4] bg-white px-4 text-[13px] font-medium"
              onClick={handleSaveTemplate}
              disabled={mutations.savePurchaseOrderTemplate.isPending}
            >
              {mutations.savePurchaseOrderTemplate.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-3.5" />
              )}
              Save Template
            </Button>
            <Button
              className="h-9 rounded-full bg-[#0066cc] px-4 text-[13px] font-medium text-white hover:bg-[#0057ad]"
              onClick={handleIssuePurchaseOrder}
            >
              <Send className="mr-1.5 size-3.5" />
              Generate & Download
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <Tabs defaultValue="template" className="flex flex-col gap-4">
            <TabsList variant="line" className="flex h-auto w-full justify-start gap-8 rounded-none border-b border-[#e5e7eb] p-0 bg-transparent">
              <TabsTrigger value="template" className="h-11 px-1 text-[13px] font-medium data-[state=active]:text-[#0066cc] after:data-[state=active]:bg-[#0066cc]">Template</TabsTrigger>
              <TabsTrigger value="document" className="h-11 px-1 text-[13px] font-medium data-[state=active]:text-[#0066cc] after:data-[state=active]:bg-[#0066cc]">Document</TabsTrigger>
              <TabsTrigger value="items" className="h-11 px-1 text-[13px] font-medium data-[state=active]:text-[#0066cc] after:data-[state=active]:bg-[#0066cc]">Line Items</TabsTrigger>
              <TabsTrigger value="delivery" className="h-11 px-1 text-[13px] font-medium data-[state=active]:text-[#0066cc] after:data-[state=active]:bg-[#0066cc]">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="mt-0 space-y-5">
              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Branding & Layout</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Template Name">
                    <Input className={inputClassName} value={currentForm.template.name} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, name: event.target.value } })} />
                  </Field>
                  <Field label="Page Size">
                    <Select value={currentForm.template.pageSize} onValueChange={(value: 'A4' | 'LETTER') => setForm({ ...currentForm, template: { ...currentForm.template, pageSize: value } })}>
                      <SelectTrigger className={inputClassName}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="LETTER">Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Display Name">
                    <Input className={inputClassName} value={currentForm.template.company.displayName} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, displayName: event.target.value } } })} />
                  </Field>
                  <Field label="Legal Company Name">
                    <Input className={inputClassName} value={currentForm.template.company.name} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, name: event.target.value } } })} />
                  </Field>
                  <Field label="Logo URL">
                    <Input className={inputClassName} value={currentForm.template.company.logoUrl ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, logoUrl: event.target.value || null } } })} />
                  </Field>
                  <Field label="Tax ID">
                    <Input className={inputClassName} value={currentForm.template.company.taxId ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, taxId: event.target.value || null } } })} />
                  </Field>
                  <Field label="Contact Email">
                    <Input className={inputClassName} value={currentForm.template.company.contactEmail ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, contactEmail: event.target.value || null } } })} />
                  </Field>
                  <Field label="Contact Phone">
                    <Input className={inputClassName} value={currentForm.template.company.contactPhone ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, contactPhone: event.target.value || null } } })} />
                  </Field>
                  <Field label="Address" className="md:col-span-2">
                    <Textarea className={textareaClassName} value={currentForm.template.company.address ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, company: { ...currentForm.template.company, address: event.target.value || null } } })} />
                  </Field>
                  <Field label="Header Title">
                    <Input className={inputClassName} value={currentForm.template.headerTitle} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, headerTitle: event.target.value } })} />
                  </Field>
                  <Field label="Header Subtitle">
                    <Input className={inputClassName} value={currentForm.template.headerSubtitle ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, headerSubtitle: event.target.value || null } })} />
                  </Field>
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Template Rich Text</h2>
                <div className="mt-4 grid gap-5">
                  <RichTextField label="Header Intro" value={currentForm.template.headerRichText} onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, headerRichText: value } })} placeholder="Add a short branded introduction above the purchase order details." />
                  <RichTextField label="Default Payment Terms" value={currentForm.template.defaultPaymentTermsHtml} onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultPaymentTermsHtml: value } })} placeholder="Define reusable payment instructions for every purchase order." />
                  <RichTextField label="Default Notes" value={currentForm.template.defaultNotesHtml} onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultNotesHtml: value } })} placeholder="Add default operational notes." />
                  <RichTextField label="Default Terms" value={currentForm.template.defaultTermsHtml} onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, defaultTermsHtml: value } })} placeholder="List your standard purchase order terms." />
                  <RichTextField label="Footer Text" value={currentForm.template.footerRichText} onChange={(value) => setForm({ ...currentForm, template: { ...currentForm.template, footerRichText: value } })} placeholder="Optional footer copy repeated at the bottom of generated PDFs." />
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Visibility & Signature</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleField label="Show logo" description="Render tenant branding at the top of the PDF." checked={currentForm.template.visibility.showLogo} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showLogo: checked } } })} />
                  <ToggleField label="Vendor contacts" description="Include vendor contact person, email, phone, and tax info." checked={currentForm.template.visibility.showVendorContact} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showVendorContact: checked } } })} />
                  <ToggleField label="Vendor address" description="Display the vendor postal address block." checked={currentForm.template.visibility.showVendorAddress} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showVendorAddress: checked } } })} />
                  <ToggleField label="Billing address" description="Show a dedicated billing address field in the PDF." checked={currentForm.template.visibility.showBillingAddress} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showBillingAddress: checked } } })} />
                  <ToggleField label="Shipping address" description="Show the shipping destination block in the PDF." checked={currentForm.template.visibility.showShippingAddress} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showShippingAddress: checked } } })} />
                  <ToggleField label="Subject" description="Show the subject block above the notes and terms sections." checked={currentForm.template.visibility.showSubject} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showSubject: checked } } })} />
                  <ToggleField label="Payment terms" description="Include payment terms in the generated PDF when they are filled in." checked={currentForm.template.visibility.showPaymentTerms} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showPaymentTerms: checked } } })} />
                  <ToggleField label="Notes" description="Control whether the notes section appears in the final PDF." checked={currentForm.template.visibility.showNotes} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showNotes: checked } } })} />
                  <ToggleField label="Terms" description="Show or hide the terms and conditions section." checked={currentForm.template.visibility.showTerms} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showTerms: checked } } })} />
                  <ToggleField label="Footer" description="Render footer copy and page numbering at the bottom of each page." checked={currentForm.template.visibility.showFooter} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showFooter: checked } } })} />
                  <ToggleField label="Signature block" description="Render signatory details and optional signature image." checked={currentForm.template.visibility.showSignature} onCheckedChange={(checked) => setForm({ ...currentForm, template: { ...currentForm.template, visibility: { ...currentForm.template.visibility, showSignature: checked } } })} />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Signatory Name">
                    <Input className={inputClassName} value={currentForm.template.signatory.name ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, name: event.target.value || null } } })} />
                  </Field>
                  <Field label="Signatory Title">
                    <Input className={inputClassName} value={currentForm.template.signatory.title ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, title: event.target.value || null } } })} />
                  </Field>
                  <Field label="Signature Image URL" className="md:col-span-2">
                    <Input className={inputClassName} value={currentForm.template.signatory.signatureImageUrl ?? ''} onChange={(event) => setForm({ ...currentForm, template: { ...currentForm.template, signatory: { ...currentForm.template.signatory, signatureImageUrl: event.target.value || null } } })} />
                  </Field>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="document" className="mt-0 space-y-5">
              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Vendor & Document Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Vendor Name">
                    <Input className={inputClassName} value={currentForm.document.document.vendor.name} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, name: event.target.value } } } })} />
                  </Field>
                  <Field label="Contact Person">
                    <Input className={inputClassName} value={currentForm.document.document.vendor.contactPerson ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, contactPerson: event.target.value || null } } } })} />
                  </Field>
                  <Field label="Email">
                    <Input className={inputClassName} value={currentForm.document.document.vendor.email ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, email: event.target.value || null } } } })} />
                  </Field>
                  <Field label="Phone">
                    <Input className={inputClassName} value={currentForm.document.document.vendor.phone ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, phone: event.target.value || null } } } })} />
                  </Field>
                  <Field label="Tax ID">
                    <Input className={inputClassName} value={currentForm.document.document.vendor.taxId ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, taxId: event.target.value || null } } } })} />
                  </Field>
                  <Field label="Currency">
                    <Input className={inputClassName} value={currentForm.document.document.currency} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, currency: event.target.value.toUpperCase() } } })} />
                  </Field>
                  <Field label="Vendor Address" className="md:col-span-2">
                    <Textarea className={textareaClassName} value={currentForm.document.document.vendor.address ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, vendor: { ...currentForm.document.document.vendor, address: event.target.value || null } } } })} />
                  </Field>
                  <Field label="Purchase Order Date">
                    <Input type="date" className={inputClassName} value={currentForm.document.document.purchaseOrderDate} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, purchaseOrderDate: event.target.value } } })} />
                  </Field>
                  <Field label="Delivery Date">
                    <Input type="date" className={inputClassName} value={currentForm.document.document.deliveryDate ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, deliveryDate: event.target.value || null } } })} />
                  </Field>
                  <Field label="Subject" className="md:col-span-2">
                    <Input className={inputClassName} value={currentForm.document.document.subject ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, subject: event.target.value || null } } })} />
                  </Field>
                  <Field label="Billing Address" className="md:col-span-2">
                    <Textarea className={textareaClassName} value={currentForm.document.document.billingAddress ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, billingAddress: event.target.value || null } } })} />
                  </Field>
                  <Field label="Shipping Address" className="md:col-span-2">
                    <Textarea className={textareaClassName} value={currentForm.document.document.shippingAddress ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, shippingAddress: event.target.value || null } } })} />
                  </Field>
                  <Field label="Shipping Method" className="md:col-span-2">
                    <Input className={inputClassName} value={currentForm.document.document.shippingMethod ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, shippingMethod: event.target.value || null } } })} />
                  </Field>
                </div>
              </section>

              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Document Rich Text</h2>
                <div className="mt-4 grid gap-5">
                  <RichTextField label="Payment Terms" value={currentForm.document.document.paymentTermsHtml} onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, paymentTermsHtml: value } } })} placeholder="Document-specific payment terms." />
                  <RichTextField label="Notes" value={currentForm.document.document.notesHtml} onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, notesHtml: value } } })} placeholder="Finance notes, sourcing context, or delivery instructions." />
                  <RichTextField label="Terms" value={currentForm.document.document.termsHtml} onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, termsHtml: value } } })} placeholder="Document-specific terms and conditions." />
                  <RichTextField label="Footer Notes" value={currentForm.document.document.footerNotesHtml} onChange={(value) => setForm({ ...currentForm, document: { ...currentForm.document, document: { ...currentForm.document.document, footerNotesHtml: value } } })} placeholder="Optional notes repeated at the bottom of the PDF." />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="items" className="mt-0 space-y-5">
              <section className={sectionClassName}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#111827]">Line Items</h2>
                    <p className="mt-1 text-[13px] text-[#6e6e73]">
                      Multi-row purchase orders are supported in v1, and the backend PDF renderer paginates long tables.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full"
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
                    <Plus className="mr-2 size-4" />
                    Add Item
                  </Button>
                </div>

                <div className="mt-5 space-y-4">
                  {currentForm.document.lineItems.map((item, index) => (
                    <div key={`line-item-${index}`} className="rounded-[24px] border border-[#e5e7eb] bg-[#fafafc] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-[14px] font-semibold text-[#111827]">Item {index + 1}</p>
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
                            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium text-[#b3261e] hover:bg-[#fff1f2]"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Description" className="md:col-span-2">
                          <Textarea className={textareaClassName} value={item.description} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { description: event.target.value }) } })} />
                        </Field>
                        <Field label="SKU / Code">
                          <Input className={inputClassName} value={item.sku ?? ''} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { sku: event.target.value || null }) } })} />
                        </Field>
                        <Field label="Quantity">
                          <Input type="number" min={1} className={inputClassName} value={item.quantity} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { quantity: Number(event.target.value || 1) }) } })} />
                        </Field>
                        <Field label="Unit Price">
                          <Input type="number" min={0} className={inputClassName} value={item.unitPrice} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { unitPrice: Number(event.target.value || 0) }) } })} />
                        </Field>
                        <Field label="Tax Percent">
                          <Input type="number" min={0} max={100} className={inputClassName} value={item.taxPercent} onChange={(event) => setForm({ ...currentForm, document: { ...currentForm.document, lineItems: updateLineItem(currentForm.document.lineItems, index, { taxPercent: Number(event.target.value || 0) }) } })} />
                        </Field>
                        <Field label="Auto Total">
                          <Input className={inputClassName} value={item.total.toFixed(2)} readOnly />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="delivery" className="mt-0 space-y-5">
              <section className={sectionClassName}>
                <h2 className="text-[18px] font-semibold text-[#111827]">Recipient & Delivery</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ToggleField label="Email an admin recipient" description="Send the final issued PDF to an approved admin contact after generation." checked={currentForm.sendToAdmin} onCheckedChange={(checked) => setForm({ ...currentForm, sendToAdmin: checked })} />
                  <div className="rounded-2xl border border-[#e5e5ea] bg-[#f8f8fb] px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#111827]">Email configuration</p>
                    <p className="mt-1 text-[12px] text-[#6e6e73]">
                      {draft.emailConfigured ? 'Server email delivery is configured.' : 'Server email delivery is not configured yet.'}
                    </p>
                  </div>
                  <Field label="Admin Recipient">
                    <Select value={currentForm.recipientMemberId ?? undefined} onValueChange={updateRecipient}>
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
                  <Field label="Finance Note">
                    <Input className={inputClassName} value={currentForm.message ?? ''} onChange={(event) => setForm({ ...currentForm, message: event.target.value || null })} />
                  </Field>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <div className="flex h-11 flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-full border-[#d7dbe4] bg-white px-4 text-[13px] font-medium"
              onClick={() => {
                setForm(buildInitialForm(draft));
                setPreviewUrl(null);
              }}
            >
              <RefreshCcw className="mr-1.5 size-3.5" />
              Reset
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-full border-[#d7dbe4] bg-white px-4 text-[13px] font-medium text-[#111827]"
              onClick={handlePreview}
            >
              <Download className="mr-1.5 size-3.5" />
              Preview PDF
            </Button>
          </div>
          <div className="overflow-hidden rounded-none bg-[#f5f5f7] shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            {previewUrl ? (
              <iframe title="Purchase order PDF preview" src={`${previewUrl}#toolbar=0`} className="h-[760px] w-full border-0 bg-white" />
            ) : (
              <div className="flex h-[760px] items-center justify-center p-10 text-center">
                <div className="max-w-sm space-y-3">
                  <p className="text-[16px] font-semibold text-[#111827]">Render the live PDF when you&apos;re ready</p>
                  <p className="text-[14px] leading-6 text-[#6e6e73]">
                    The preview uses the same FastAPI rendering path as the final generated file, so pagination,
                    footer behavior, and rich text layout stay aligned.
                  </p>
                  <Button className="rounded-full bg-[#0066cc] text-white hover:bg-[#0057ad]" onClick={handlePreview}>
                    <Download className="mr-2 size-4" />
                    Generate Preview
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
