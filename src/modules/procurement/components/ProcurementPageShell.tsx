'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronUp, Download, FileText, MoreHorizontal, Search, Send, ShoppingCart, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDate, humanize, readError } from '@/modules/assets/lib/assetUtils';
import { useProcurementMutations } from '@/modules/procurement/hooks/useProcurementMutations';
import {
  useProcurementListQuery,
  useProcurementMetaQuery,
  useProcurementPurchaseOrdersQuery,
} from '@/modules/procurement/hooks/useProcurementQueries';
import type {
  BulkProcurementInput,
  ReplacementProcurementInput,
} from '@/modules/procurement/schema/procurementSchemas';
import type {
  ProcurementPurchaseOrderListItem,
  ProcurementRequisitionRecord,
  ProcurementReplacementTicketOption,
} from '@/modules/procurement/types/procurementTypes';

type PageTab = 'bulk' | 'replacement' | 'mine' | 'pending' | 'history' | 'purchaseOrders';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-[#d1d5db] bg-[#f3f4f6] text-[#4b5563]',
  PENDING_FINANCE_APPROVAL: 'border-[#fde68a] bg-[#fff7e8] text-[#9a6700]',
  APPROVED: 'border-[#bbf7d0] bg-[#eef9f1] text-[#156f3d]',
  REJECTED: 'border-[#fecaca] bg-[#fff1f1] text-[#b3261e]',
  CANCELLED: 'border-[#e5e7eb] bg-[#f7f7f8] text-[#6b7280]',
};
const PURCHASE_ORDER_STATUS_STYLES: Record<string, string> = {
  GENERATED: 'border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]',
  SENT: STATUS_STYLES.APPROVED,
  FAILED: STATUS_STYLES.REJECTED,
  CANCELLED: STATUS_STYLES.CANCELLED,
};

const PROCUREMENT_TAB_STYLES =
  'inline-flex h-9 items-center rounded-xl border border-transparent bg-transparent px-3 text-[13px] font-medium whitespace-nowrap text-[#6b7280] shadow-none transition-all duration-200 ease-out hover:text-[#111827]';

const PROCUREMENT_TAB_ACTIVE_STYLES =
  'border-[#d8eadf] bg-white text-[#00874a] shadow-[0_2px_8px_rgba(0,0,0,0.05)]';
const PROCUREMENT_SECTION_CARD_CLASSNAME =
  'w-full rounded-[28px] border border-[#e5e7eb] bg-white p-6';
const PROCUREMENT_FORM_GRID_CLASSNAME = 'grid gap-5 md:grid-cols-2';
const PROCUREMENT_FIELD_CLASSNAME = 'grid gap-2';
const PROCUREMENT_LABEL_CLASSNAME =
  'text-[14px] font-semibold leading-5 text-[#374151]';
const PROCUREMENT_FORM_CONTROL_CLASSNAME =
  'box-border h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-base leading-6 text-[#111827] shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-[#9ca3af] focus-visible:border-[#00874a] focus-visible:ring-3 focus-visible:ring-[#00874a]/15 disabled:h-[52px] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:opacity-100 read-only:bg-[#f8fafc]';
const PROCUREMENT_SELECT_TRIGGER_CLASSNAME = cn(
  PROCUREMENT_FORM_CONTROL_CLASSNAME,
  'flex items-center justify-between gap-3 py-0 pr-3 data-[size=default]:h-[52px] [&_svg]:self-center [&_svg]:text-[#94a3b8] [&_[data-slot=select-value]]:flex [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:items-center [&_[data-slot=select-value]]:text-base [&_[data-slot=select-value]]:leading-6',
);
const PROCUREMENT_DATE_FIELD_CLASSNAME =
  '[&::-webkit-calendar-picker-indicator]:my-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer';
const PROCUREMENT_TEXTAREA_CLASSNAME =
  'box-border w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-6 text-[#111827] shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-[#9ca3af] focus-visible:border-[#00874a] focus-visible:ring-3 focus-visible:ring-[#00874a]/15 disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#64748b] disabled:opacity-100 read-only:bg-[#f8fafc]';
const REQUISITION_TABLE_SKELETON_IDS = Array.from({ length: 6 }, (_, index) => `procurement-skeleton-${index}`);
const REQUISITION_COLUMN_WIDTHS = ['26%', '12%', '15%', '12%', '14%', '11%', '10%', '6%'] as const;
const requisitionColumnHelper = createColumnHelper<ProcurementRequisitionRecord>();
const PURCHASE_ORDER_TABLE_SKELETON_IDS = Array.from({ length: 6 }, (_, index) => `procurement-po-skeleton-${index}`);
const PURCHASE_ORDER_COLUMN_WIDTHS = ['16%', '14%', '18%', '11%', '13%', '14%', '10%', '4%'] as const;
const purchaseOrderColumnHelper = createColumnHelper<ProcurementPurchaseOrderListItem>();

function formatProcurementCurrency(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(PROCUREMENT_FIELD_CLASSNAME, className)}>
      <FormLabel>{label}</FormLabel>
      {children}
    </div>
  );
}

function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label className={cn(PROCUREMENT_LABEL_CLASSNAME, className)} {...props} />;
}

function FormInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn(PROCUREMENT_FORM_CONTROL_CLASSNAME, className)} {...props} />;
}

function FormDateInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <Input
      type="date"
      className={cn(PROCUREMENT_FORM_CONTROL_CLASSNAME, PROCUREMENT_DATE_FIELD_CLASSNAME, className)}
      {...props}
    />
  );
}

function FormSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={PROCUREMENT_SELECT_TRIGGER_CLASSNAME}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

function FormTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea className={cn(PROCUREMENT_TEXTAREA_CLASSNAME, className)} {...props} />;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">{label}</p>
      <p className="break-words text-[14px] leading-6 text-[#111827]">{value}</p>
    </div>
  );
}

function buildBulkDefault(): BulkProcurementInput {
  return {
    requestType: 'BULK',
    assetName: '',
    assetCode: '',
    categoryDefinitionId: '',
    estimatedQuantity: 1,
    estimatedUnitCost: null,
    estimatedTotalCost: null,
    requiredByDate: '',
    costCenterOrDepartmentId: '',
    vendorPreference: '',
    urgency: 'MEDIUM',
    justification: '',
    specificationNotes: '',
  };
}

function buildReplacementDefault(): ReplacementProcurementInput {
  return {
    requestType: 'REPLACEMENT',
    maintenanceTicketId: '',
    estimatedUnitCost: null,
    estimatedTotalCost: null,
    requiredByDate: '',
    costCenterOrDepartmentId: '',
    vendorPreference: '',
    urgency: 'HIGH',
    justification: '',
    replacementReason: '',
  };
}

export function ProcurementPageShell({
  orgSlug,
  memberId,
  canCreateProcurement,
  canApproveProcurement,
  initialRequisitionId,
}: {
  orgSlug: string;
  memberId: string;
  canCreateProcurement: boolean;
  canApproveProcurement: boolean;
  initialRequisitionId?: string | null;
}) {
  const router = useRouter();
  const metaQuery = useProcurementMetaQuery(orgSlug, memberId);
  const listQuery = useProcurementListQuery(orgSlug, memberId);
  const purchaseOrderListQuery = useProcurementPurchaseOrdersQuery(orgSlug, memberId, canApproveProcurement);
  const mutations = useProcurementMutations(orgSlug, memberId);

  const [activeTab, setActiveTab] = useState<PageTab>(
    canCreateProcurement ? 'bulk' : canApproveProcurement ? 'pending' : 'history',
  );
  const [search, setSearch] = useState('');
  const [bulkForm, setBulkForm] = useState<BulkProcurementInput>(() => buildBulkDefault());
  const [replacementForm, setReplacementForm] = useState<ReplacementProcurementInput>(() => buildReplacementDefault());
  const [selectedRequisition, setSelectedRequisition] = useState<ProcurementRequisitionRecord | null>(null);
  const [initialLinkAcknowledged, setInitialLinkAcknowledged] = useState(false);
  const [decisionComment, setDecisionComment] = useState('');
  const [isComposerDialogOpen, setIsComposerDialogOpen] = useState(false);
  const [selectedComposerRequisitionId, setSelectedComposerRequisitionId] = useState('');

  const requisitions = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const purchaseOrders = useMemo(
    () => purchaseOrderListQuery.data?.items ?? [],
    [purchaseOrderListQuery.data?.items],
  );
  const meta = metaQuery.data;
  const selectedTicket = useMemo<ProcurementReplacementTicketOption | null>(
    () => meta?.replacementTickets.find((ticket) => ticket.id === replacementForm.maintenanceTicketId) ?? null,
    [meta?.replacementTickets, replacementForm.maintenanceTicketId],
  );
  const selectedBulkCategory = useMemo(
    () => meta?.categories.find((category) => category.id === bulkForm.categoryDefinitionId) ?? null,
    [meta?.categories, bulkForm.categoryDefinitionId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requisitions;
    return requisitions.filter((item) =>
      [
        item.requestLabel,
        item.assetName,
        item.assetCode,
        item.raisedByName,
        item.maintenanceTicketId,
        item.status,
        item.requestType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [requisitions, search]);

  const myRequisitions = useMemo(
    () => filtered.filter((item) => item.raisedByMemberId === memberId),
    [filtered, memberId],
  );
  const pendingRequisitions = useMemo(
    () => filtered.filter((item) => item.status === 'PENDING_FINANCE_APPROVAL'),
    [filtered],
  );
  const historyRequisitions = useMemo(
    () => filtered.filter((item) => item.status !== 'PENDING_FINANCE_APPROVAL'),
    [filtered],
  );
  const approvedRequisitions = useMemo(
    () => requisitions.filter((item) => item.status === 'APPROVED'),
    [requisitions],
  );
  const selectedComposerRequisition = useMemo(
    () => approvedRequisitions.find((item) => item.id === selectedComposerRequisitionId) ?? null,
    [approvedRequisitions, selectedComposerRequisitionId],
  );
  const deepLinkedRequisition = useMemo(
    () => (!initialLinkAcknowledged && initialRequisitionId
      ? requisitions.find((item) => item.id === initialRequisitionId) ?? null
      : null),
    [initialLinkAcknowledged, initialRequisitionId, requisitions],
  );
  const dialogRequisition = selectedRequisition ?? deepLinkedRequisition;
  const filteredPurchaseOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchaseOrders;
    return purchaseOrders.filter((item) =>
      [
        item.poNumber,
        item.requestLabel,
        item.assetName,
        item.generatedByName,
        item.recipientName,
        item.recipientEmail,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [purchaseOrders, search]);

  const bulkComputedTotal =
    bulkForm.estimatedQuantity && bulkForm.estimatedUnitCost != null
      ? bulkForm.estimatedQuantity * bulkForm.estimatedUnitCost
      : null;
  const replacementComputedTotal = replacementForm.estimatedUnitCost ?? null;
  const tabOptions = [
    ...(canCreateProcurement
      ? ([
          ['bulk', 'Bulk Asset Purchasing'],
          ['replacement', 'Replacement Purchasing'],
          ['mine', 'My Requisitions'],
        ] as const)
      : []),
    ['pending', 'Pending Approval'],
    ['history', 'Approved / Rejected History'],
    ...(canApproveProcurement ? ([['purchaseOrders', 'Generated Purchase Orders']] as const) : []),
  ] as const;

  async function createBulk(saveDraft: boolean) {
    try {
      const created = await mutations.createBulk.mutateAsync({
        ...bulkForm,
        estimatedTotalCost: bulkForm.estimatedTotalCost ?? bulkComputedTotal,
      });
      if (!saveDraft) {
        await mutations.submit.mutateAsync(created.id);
        toast.success('Bulk purchasing requisition submitted to Finance');
      } else {
        toast.success('Bulk purchasing draft saved');
      }
      setBulkForm(buildBulkDefault());
      setActiveTab('mine');
    } catch (error) {
      toast.error(readError(error, 'Failed to create requisition'));
    }
  }

  async function createReplacement(saveDraft: boolean) {
    try {
      const created = await mutations.createReplacement.mutateAsync({
        ...replacementForm,
        estimatedTotalCost: replacementForm.estimatedTotalCost ?? replacementComputedTotal,
      });
      if (!saveDraft) {
        await mutations.submit.mutateAsync(created.id);
        toast.success('Replacement purchasing requisition submitted to Finance');
      } else {
        toast.success('Replacement purchasing draft saved');
      }
      setReplacementForm(buildReplacementDefault());
      setActiveTab('mine');
    } catch (error) {
      toast.error(readError(error, 'Failed to create requisition'));
    }
  }

  async function handleApprove() {
    if (!dialogRequisition) return;
    try {
      await mutations.approve.mutateAsync({
        requisitionId: dialogRequisition.id,
        data: { comment: decisionComment || null },
      });
      toast.success('Requisition approved');
      setSelectedRequisition(null);
      setDecisionComment('');
    } catch (error) {
      toast.error(readError(error, 'Failed to approve requisition'));
    }
  }

  async function handleReject() {
    if (!dialogRequisition) return;
    if (!decisionComment.trim()) {
      toast.error('Comment is required to reject a requisition');
      return;
    }
    try {
      await mutations.reject.mutateAsync({
        requisitionId: dialogRequisition.id,
        data: { comment: decisionComment },
      });
      toast.success('Requisition rejected');
      setSelectedRequisition(null);
      setDecisionComment('');
    } catch (error) {
      toast.error(readError(error, 'Failed to reject requisition'));
    }
  }

  async function handleCancel(requisitionId: string) {
    try {
      await mutations.cancel.mutateAsync(requisitionId);
      toast.success('Requisition cancelled');
    } catch (error) {
      toast.error(readError(error, 'Failed to cancel requisition'));
    }
  }

  function openComposerDialog() {
    if (approvedRequisitions.length === 0) {
      toast.error('Approve a requisition before opening the PO composer');
      return;
    }
    setSelectedComposerRequisitionId((current) => current || approvedRequisitions[0]?.id || '');
    setIsComposerDialogOpen(true);
  }

  function handleOpenComposerWorkspace() {
    if (!selectedComposerRequisitionId) {
      toast.error('Select an approved requisition to continue');
      return;
    }
    setIsComposerDialogOpen(false);
    router.push(`/${orgSlug}/procurement/purchase-orders/${selectedComposerRequisitionId}`);
  }

  async function handleDownloadPurchaseOrder(purchaseOrderId: string) {
    try {
      const response = await mutations.downloadPurchaseOrder.mutateAsync(purchaseOrderId);
      window.open(response.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(readError(error, 'Failed to prepare purchase order download'));
    }
  }

  return (
    <div className="w-full space-y-6 pb-6" suppressHydrationWarning>
      <div className="mb-6 border-b border-[#e5e7eb] pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">Procurement</h1>
            <p className="mt-1 text-[14px] text-[#6b7280]">
              Route asset purchase requests through Finance before any procurement begins.
            </p>
          </div>

          <div className="flex h-11 w-full max-w-sm items-center gap-2.5 rounded-full border border-[#e5e7eb] bg-white px-4">
            <Search className="size-4 text-[#9ca3af]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search procurement records..."
              className="h-auto border-0 bg-transparent px-0 py-0 text-[14px] shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-fit items-center gap-1 rounded-2xl border border-black/4 bg-neutral-50 p-1">
              {tabOptions.map(([value, label]) => {
                const isActive = activeTab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActiveTab(value)}
                    className={cn(
                      PROCUREMENT_TAB_STYLES,
                      isActive ? PROCUREMENT_TAB_ACTIVE_STYLES : '',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {canApproveProcurement ? (
            <Button
              type="button"
              onClick={openComposerDialog}
              disabled={approvedRequisitions.length === 0}
              className="h-11 rounded-full bg-[#0066cc] px-5 text-[13px] font-medium text-white hover:bg-[#0057ad] disabled:bg-[#c7d2e5] disabled:text-white"
            >
              <FileText className="mr-2 size-4" />
              Open PO Composer
            </Button>
          ) : null}
        </div>

        {activeTab === 'bulk' && canCreateProcurement ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className={PROCUREMENT_SECTION_CARD_CLASSNAME}>
              <div className="mb-6">
                <h2 className="text-[22px] font-semibold text-[#111827]">Bulk Asset Purchasing</h2>
                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Create a finance approval request before buying multiple assets for inventory or team rollout.
                </p>
              </div>

              <div className={PROCUREMENT_FORM_GRID_CLASSNAME}>
                <FormField label="Asset Name">
                  <FormInput
                    value={bulkForm.assetName}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, assetName: e.target.value }))}
                    placeholder="Dell Latitude 5450"
                  />
                </FormField>
                <FormField label="Category">
                  <FormSelect
                    value={bulkForm.categoryDefinitionId ?? ''}
                    onValueChange={(value) => {
                      const category = meta?.categories.find((item) => item.id === value) ?? null;
                      setBulkForm((prev) => ({
                        ...prev,
                        categoryDefinitionId: value,
                        assetCode: category?.assetCode ?? '',
                      }));
                    }}
                    placeholder="Select category"
                  >
                    {(meta?.categories ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label="Asset Code">
                  <FormInput
                    value={selectedBulkCategory?.assetCode ?? bulkForm.assetCode ?? ''}
                    readOnly
                    disabled
                    placeholder="Select category to map asset code"
                  />
                </FormField>
                <FormField label="Quantity">
                  <FormInput
                    type="number"
                    min={1}
                    value={bulkForm.estimatedQuantity}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, estimatedQuantity: Number(e.target.value || 1) }))}
                  />
                </FormField>
                <FormField label="Estimated Unit Cost">
                  <FormInput
                    type="number"
                    min={0}
                    value={bulkForm.estimatedUnitCost ?? ''}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, estimatedUnitCost: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Estimated Total Cost">
                  <FormInput
                    type="number"
                    min={0}
                    value={bulkForm.estimatedTotalCost ?? ''}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, estimatedTotalCost: e.target.value ? Number(e.target.value) : null }))}
                    placeholder={bulkComputedTotal != null ? String(bulkComputedTotal) : 'Auto-calculated'}
                  />
                </FormField>
                <FormField label="Required By">
                  <FormDateInput
                    value={bulkForm.requiredByDate ?? ''}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, requiredByDate: e.target.value }))}
                  />
                </FormField>
                <FormField label="Department / Cost Center">
                  <FormSelect
                    value={bulkForm.costCenterOrDepartmentId ?? ''}
                    onValueChange={(value) => setBulkForm((prev) => ({ ...prev, costCenterOrDepartmentId: value }))}
                    placeholder="Select department"
                  >
                    {(meta?.departments ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label="Vendor Preference">
                  <FormInput
                    value={bulkForm.vendorPreference ?? ''}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, vendorPreference: e.target.value }))}
                    placeholder="Preferred vendor or marketplace"
                  />
                </FormField>
                <FormField label="Urgency">
                  <FormSelect
                    value={bulkForm.urgency ?? 'MEDIUM'}
                    onValueChange={(value) => setBulkForm((prev) => ({ ...prev, urgency: value as BulkProcurementInput['urgency'] }))}
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((urgency) => (
                      <SelectItem key={urgency} value={urgency}>
                        {humanize(urgency)}
                      </SelectItem>
                    ))}
                  </FormSelect>
                </FormField>
              </div>

              <FormField label="Business Justification" className="mt-5">
                <FormTextarea value={bulkForm.justification} onChange={(e) => setBulkForm((prev) => ({ ...prev, justification: e.target.value }))} placeholder="Explain why this purchase is needed, who it supports, and why the spend is justified." className="min-h-28" />
              </FormField>
              <FormField label="Specification Notes" className="mt-5">
                <FormTextarea value={bulkForm.specificationNotes ?? ''} onChange={(e) => setBulkForm((prev) => ({ ...prev, specificationNotes: e.target.value }))} placeholder="Optional technical requirements, warranty expectations, accessory needs, or vendor notes." className="min-h-24" />
              </FormField>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => void createBulk(true)} disabled={mutations.createBulk.isPending || mutations.submit.isPending}>
                  Save Draft
                </Button>
                <Button className="rounded-full bg-[#00874a] hover:bg-[#007241]" onClick={() => void createBulk(false)} disabled={mutations.createBulk.isPending || mutations.submit.isPending}>
                  <Send className="mr-2 size-4" />
                  Submit to Finance
                </Button>
              </div>
            </section>

            <aside className={cn(PROCUREMENT_SECTION_CARD_CLASSNAME, 'self-start')}>
              <h3 className="text-[18px] font-semibold text-[#111827]">Request Summary</h3>
              <div className="mt-5 grid gap-4">
                <DetailField label="Quantity" value={String(bulkForm.estimatedQuantity)} />
                <DetailField label="Unit Cost" value={formatProcurementCurrency(bulkForm.estimatedUnitCost ?? null)} />
                <DetailField label="Projected Spend" value={formatProcurementCurrency(bulkForm.estimatedTotalCost ?? bulkComputedTotal ?? null)} />
                <DetailField label="Required By" value={formatDate(bulkForm.requiredByDate)} />
                <DetailField label="Urgency" value={humanize(bulkForm.urgency ?? 'MEDIUM')} />
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === 'replacement' && canCreateProcurement ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className={PROCUREMENT_SECTION_CARD_CLASSNAME}>
              <div className="mb-6">
                <h2 className="text-[22px] font-semibold text-[#111827]">Replacement Purchasing</h2>
                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Link the purchasing request to an employee-raised asset issue so Finance sees the operational proof.
                </p>
              </div>

              <FormField label="Linked Ticket">
                <FormSelect
                  value={replacementForm.maintenanceTicketId}
                  onValueChange={(value) => setReplacementForm((prev) => ({ ...prev, maintenanceTicketId: value }))}
                  placeholder="Select replacement ticket"
                >
                  {(meta?.replacementTickets ?? []).map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      {ticket.ticketId} - {ticket.assetName ?? 'Asset'} - {ticket.affectedEmployeeName ?? 'Employee'}
                    </SelectItem>
                  ))}
                </FormSelect>
              </FormField>

              <div className="mt-5 rounded-3xl border border-[#e5e7eb] bg-[#fbfbfc] p-5">
                <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
                  <ShoppingCart className="size-4 text-[#00874a]" />
                  Ticket Proof
                </div>
                {selectedTicket ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label="Ticket" value={selectedTicket.ticketId} />
                    <DetailField label="Employee" value={selectedTicket.affectedEmployeeName ?? 'Not linked'} />
                    <DetailField label="Asset" value={selectedTicket.assetName ?? 'Not linked'} />
                    <DetailField label="Asset Code" value={selectedTicket.assetCode ?? '—'} />
                    <DetailField label="Serial" value={selectedTicket.serialNumber ?? '—'} />
                    <DetailField label="Raised Date" value={formatDate(selectedTicket.createdAt)} />
                    <DetailField label="Original Purchase Date" value={formatDate(selectedTicket.originalPurchaseDate)} />
                    <DetailField label="Warranty Expiry" value={formatDate(selectedTicket.warrantyExpiryDate)} />
                    <DetailField label="Warranty Status" value={humanize(selectedTicket.warrantyStatus)} />
                    <DetailField label="Current Condition" value={selectedTicket.currentCondition ? humanize(selectedTicket.currentCondition) : '—'} />
                    <div className="md:col-span-2 grid gap-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af]">Issue Description</p>
                      <p className="text-[14px] text-[#111827]">{selectedTicket.issueDescription}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-[#6b7280]">Choose a ticket to load the employee, asset, and warranty proof into this requisition.</p>
                )}
              </div>

              <div className={cn(PROCUREMENT_FORM_GRID_CLASSNAME, 'mt-5')}>
                <FormField label="Estimated Replacement Cost">
                  <FormInput type="number" min={0} value={replacementForm.estimatedUnitCost ?? ''} onChange={(e) => setReplacementForm((prev) => ({ ...prev, estimatedUnitCost: e.target.value ? Number(e.target.value) : null }))} />
                </FormField>
                <FormField label="Total Cost">
                  <FormInput type="number" min={0} value={replacementForm.estimatedTotalCost ?? ''} onChange={(e) => setReplacementForm((prev) => ({ ...prev, estimatedTotalCost: e.target.value ? Number(e.target.value) : null }))} placeholder={replacementComputedTotal != null ? String(replacementComputedTotal) : 'Optional override'} />
                </FormField>
                <FormField label="Required By">
                  <FormDateInput value={replacementForm.requiredByDate ?? ''} onChange={(e) => setReplacementForm((prev) => ({ ...prev, requiredByDate: e.target.value }))} />
                </FormField>
                <FormField label="Department / Cost Center">
                  <FormSelect
                    value={replacementForm.costCenterOrDepartmentId ?? ''}
                    onValueChange={(value) => setReplacementForm((prev) => ({ ...prev, costCenterOrDepartmentId: value }))}
                    placeholder="Select department"
                  >
                    {(meta?.departments ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label="Vendor Preference">
                  <FormInput value={replacementForm.vendorPreference ?? ''} onChange={(e) => setReplacementForm((prev) => ({ ...prev, vendorPreference: e.target.value }))} placeholder="Preferred vendor or model family" />
                </FormField>
                <FormField label="Urgency">
                  <FormSelect
                    value={replacementForm.urgency ?? 'HIGH'}
                    onValueChange={(value) => setReplacementForm((prev) => ({ ...prev, urgency: value as ReplacementProcurementInput['urgency'] }))}
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((urgency) => (
                      <SelectItem key={urgency} value={urgency}>
                        {humanize(urgency)}
                      </SelectItem>
                    ))}
                  </FormSelect>
                </FormField>
              </div>

              <FormField label="Replacement Reason" className="mt-5">
                <FormTextarea value={replacementForm.replacementReason} onChange={(e) => setReplacementForm((prev) => ({ ...prev, replacementReason: e.target.value }))} placeholder="Explain why repair is not enough and why a purchase is needed." className="min-h-24" />
              </FormField>
              <FormField label="Financial Justification" className="mt-5">
                <FormTextarea value={replacementForm.justification} onChange={(e) => setReplacementForm((prev) => ({ ...prev, justification: e.target.value }))} placeholder="Describe the cost, urgency, employee impact, and business reason for approving the spend." className="min-h-28" />
              </FormField>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => void createReplacement(true)} disabled={mutations.createReplacement.isPending || mutations.submit.isPending}>
                  Save Draft
                </Button>
                <Button className="rounded-full bg-[#00874a] hover:bg-[#007241]" onClick={() => void createReplacement(false)} disabled={mutations.createReplacement.isPending || mutations.submit.isPending}>
                  <Send className="mr-2 size-4" />
                  Submit to Finance
                </Button>
              </div>
            </section>

            <aside className={cn(PROCUREMENT_SECTION_CARD_CLASSNAME, 'self-start')}>
              <h3 className="text-[18px] font-semibold text-[#111827]">Replacement Summary</h3>
              <div className="mt-5 grid gap-4">
                <DetailField label="Ticket" value={selectedTicket?.ticketId ?? 'Not selected'} />
                <DetailField label="Employee" value={selectedTicket?.affectedEmployeeName ?? 'Not selected'} />
                <DetailField label="Projected Spend" value={formatProcurementCurrency(replacementForm.estimatedTotalCost ?? replacementComputedTotal ?? null)} />
                <DetailField label="Warranty" value={selectedTicket?.warrantyStatus ? humanize(selectedTicket.warrantyStatus) : 'Unknown'} />
                <DetailField label="Required By" value={formatDate(replacementForm.requiredByDate)} />
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === 'mine' && canCreateProcurement ? (
          <RequisitionTable
            orgSlug={orgSlug}
            rows={myRequisitions}
            isLoading={listQuery.isLoading}
            onOpen={setSelectedRequisition}
            onCancel={handleCancel}
          />
        ) : null}

        {activeTab === 'pending' ? (
          <RequisitionTable
            orgSlug={orgSlug}
            rows={pendingRequisitions}
            isLoading={listQuery.isLoading}
            onOpen={setSelectedRequisition}
          />
        ) : null}

        {activeTab === 'history' ? (
          <RequisitionTable
            orgSlug={orgSlug}
            rows={historyRequisitions}
            isLoading={listQuery.isLoading}
            onOpen={setSelectedRequisition}
          />
        ) : null}

        {activeTab === 'purchaseOrders' && canApproveProcurement ? (
          <PurchaseOrderTable
            rows={filteredPurchaseOrders}
            isLoading={purchaseOrderListQuery.isLoading}
            onDownload={handleDownloadPurchaseOrder}
            isDownloading={mutations.downloadPurchaseOrder.isPending}
          />
        ) : null}
      </div>

      <Dialog open={isComposerDialogOpen} onOpenChange={setIsComposerDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Open Purchase Order Composer</DialogTitle>
            <DialogDescription>
              Select an approved requisition to continue into the purchase order workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <FormField label="Approved Requisition">
              <FormSelect
                value={selectedComposerRequisitionId}
                onValueChange={setSelectedComposerRequisitionId}
                placeholder="Select an approved requisition"
              >
                {approvedRequisitions.map((requisition) => (
                  <SelectItem key={requisition.id} value={requisition.id}>
                    {(requisition.requestLabel ?? requisition.id)} - {requisition.assetName ?? requisition.requestType}
                  </SelectItem>
                ))}
              </FormSelect>
            </FormField>

            {selectedComposerRequisition ? (
              <div className="rounded-[24px] border border-[#e5e7eb] bg-[#f8fafc] p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField
                    label="Requester"
                    value={selectedComposerRequisition.raisedByName ?? 'Unknown'}
                  />
                  <DetailField
                    label="Request"
                    value={selectedComposerRequisition.requestLabel ?? selectedComposerRequisition.id}
                  />
                  <DetailField
                    label="Asset"
                    value={selectedComposerRequisition.assetName ?? selectedComposerRequisition.assetCode ?? 'Asset Purchase'}
                  />
                  <DetailField
                    label="Status"
                    value={humanize(selectedComposerRequisition.status)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setIsComposerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#0066cc] text-white hover:bg-[#0057ad]"
              onClick={handleOpenComposerWorkspace}
            >
              <FileText className="mr-2 size-4" />
              Open Composer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RequisitionDetailDialog
        open={!!dialogRequisition}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequisition(null);
            setInitialLinkAcknowledged(true);
            setDecisionComment('');
          }
        }}
        requisition={dialogRequisition}
        decisionComment={decisionComment}
        onDecisionCommentChange={setDecisionComment}
        onApprove={() => handleApprove()}
        onReject={() => handleReject()}
        isApproving={mutations.approve.isPending}
        isRejecting={mutations.reject.isPending}
        orgSlug={orgSlug}
      />
    </div>
  );
}

type RequisitionDetailTab = 'details' | 'action';

const REQUISITION_TABS: Array<{ id: RequisitionDetailTab; label: string }> = [
  { id: 'details', label: 'View Request Details' },
  { id: 'action', label: 'Action' },
];

function RequisitionDetailDialog({
  open,
  onOpenChange,
  requisition,
  decisionComment,
  onDecisionCommentChange,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  orgSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition?: ProcurementRequisitionRecord | null;
  decisionComment: string;
  onDecisionCommentChange: (comment: string) => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  orgSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<RequisitionDetailTab>('details');
  const titleId = useId();
  const descriptionId = useId();

  if (!requisition) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              initial={{ opacity: 0, x: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
              className="pointer-events-auto flex h-[600px] w-[92vw] max-w-lg flex-col overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              <div className="sr-only">
                <h2 id={titleId}>Procurement requisition details</h2>
                <p id={descriptionId}>Review requisition details and submit approval or rejection decisions.</p>
              </div>
              <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0 bg-white">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Requisition</p>
                  <h2 className="mt-0.5 flex items-center gap-2 text-[18px] font-semibold text-[#111827]">
                    {requisition.requestLabel ?? requisition.id}
                    <Badge className={cn('border', STATUS_STYLES[requisition.status] ?? STATUS_STYLES.DRAFT)}>
                      {humanize(requisition.status)}
                    </Badge>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                >
                  <XCircle className="size-4.5" />
                </button>
              </div>

              <div className="flex border-b border-[#eef0f3] bg-[#f9fafb] px-6 shrink-0">
                <div className="flex gap-6">
                  {REQUISITION_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'relative py-3.5 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer',
                          isActive
                            ? 'text-[#00874a] border-b-2 border-[#00874a] -mb-[2px]'
                            : 'text-[#9ca3af] hover:text-[#111827]',
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#f9fafb]">
                {activeTab === 'details' && (
                  <div className="mx-auto w-full space-y-4">
                    <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4 space-y-3">
                      <DetailField label="Request Type" value={humanize(requisition.requestType)} />
                      <DetailField label="Requester" value={requisition.raisedByName ?? 'Unknown'} />
                      <DetailField label="Estimated Spend" value={formatProcurementCurrency(requisition.estimatedTotalCost)} />
                      <DetailField label="Required By" value={formatDate(requisition.requiredByDate)} />
                      <DetailField label="Department" value={requisition.costCenterOrDepartmentName ?? 'Not set'} />
                      <DetailField label="Urgency" value={requisition.urgency ? humanize(requisition.urgency) : 'Not set'} />
                    </div>

                    <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af] mb-2">Justification</p>
                      <p className="text-[14px] leading-6 text-[#111827] whitespace-pre-wrap break-words">
                        {requisition.justification?.trim() || 'No justification provided.'}
                      </p>
                    </div>

                    {requisition.requestType === 'BULK' ? (
                      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">Bulk Procurement Details</p>
                        <DetailField label="Asset Name" value={requisition.assetName ?? 'Not set'} />
                        <DetailField label="Asset Code" value={requisition.assetCode ?? 'Not set'} />
                        <DetailField label="Category" value={requisition.categoryName ?? 'Not set'} />
                        <DetailField label="Quantity" value={String(requisition.estimatedQuantity ?? 0)} />
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">Replacement Details</p>
                        <DetailField label="Linked Ticket" value={requisition.ticketSnapshot?.ticketId ?? 'Not linked'} />
                        <DetailField label="Employee" value={requisition.ticketSnapshot?.affectedEmployeeName ?? 'Not linked'} />
                        <DetailField label="Asset" value={requisition.ticketSnapshot?.assetName ?? 'Not linked'} />
                        <DetailField label="Serial" value={requisition.ticketSnapshot?.serialNumber ?? '—'} />
                      </div>
                    )}

                    {requisition.reviewerComment && (
                      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af] mb-2">Reviewer Feedback</p>
                        <p className="text-[14px] leading-6 text-[#111827] whitespace-pre-wrap break-words">
                          {requisition.reviewerComment}
                        </p>
                      </div>
                    )}

                    {requisition.purchaseOrders.length > 0 ? (
                      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4 space-y-3">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">Purchase Orders</p>
                        {requisition.purchaseOrders.map((purchaseOrder) => (
                          <div key={purchaseOrder.id} className="rounded-2xl border border-[#eef0f3] bg-[#fbfbfc] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[15px] font-semibold text-[#111827]">{purchaseOrder.poNumber}</p>
                                <p className="mt-1 text-[13px] text-[#6b7280]">
                                  {purchaseOrder.recipientName || purchaseOrder.recipientEmail
                                    ? `Recipient: ${purchaseOrder.recipientName ?? purchaseOrder.recipientEmail}`
                                    : 'Saved for audit without email delivery'}
                                </p>
                              </div>
                              <Badge className={cn('border', PURCHASE_ORDER_STATUS_STYLES[purchaseOrder.status] ?? STATUS_STYLES.DRAFT)}>
                                {humanize(purchaseOrder.status)}
                              </Badge>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <DetailField label="Recipient Email" value={purchaseOrder.recipientEmail || 'Not emailed'} />
                              <DetailField label="Generated By" value={purchaseOrder.generatedByName ?? 'Unknown'} />
                              <DetailField label="Generated At" value={formatDate(purchaseOrder.generatedAt)} />
                              <DetailField label="Sent At" value={formatDate(purchaseOrder.sentAt)} />
                            </div>
                            {purchaseOrder.emailError ? (
                              <p className="mt-3 text-[13px] text-[#b3261e]">{purchaseOrder.emailError}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'action' && (
                  <div className="mx-auto w-full space-y-4">
                    {requisition.currentUserCanApprove ? (
                      <div className="space-y-4">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">Finance Decision</p>
                        <FormTextarea
                          value={decisionComment}
                          onChange={(event) => onDecisionCommentChange(event.target.value)}
                          placeholder="Add your decision feedback, approval notes, or rejection reason..."
                          className="min-h-20 bg-[#f9fafb]"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={onApprove}
                            disabled={isApproving}
                            className="h-11 w-full rounded-xl bg-[#00874a] hover:bg-[#007241]"
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            {isApproving ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={onReject}
                            disabled={isRejecting}
                            variant="outline"
                            className="h-11 w-full rounded-xl border-[#f5c2c2] text-[#b3261e] hover:bg-[#fff6f6] hover:text-[#b3261e]"
                          >
                            <XCircle className="mr-2 size-4" />
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    ) : requisition.status === 'APPROVED' ? (
                      <div className="space-y-4">
                        <div className="rounded-[18px] border border-[#d8eadf] bg-[#f6fbf8] p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#00874a]">
                              <FileText className="size-4" />
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[#111827]">Open Purchase Order Composer</p>
                              <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">
                                Continue this approved requisition in the new Crove-style composer with live PDF preview, download, and save actions.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button asChild className="h-11 w-full rounded-xl bg-[#0066cc] hover:bg-[#0055aa]">
                          <Link href={`/${orgSlug}/procurement/purchase-orders/${requisition.id}`}>
                            <FileText className="mr-2 size-4" />
                            Open PO Composer
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
                        <p className="text-[14px] text-[#6b7280]">
                          This record is view-only for your current role or it has already been decided by Finance.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function PurchaseOrderTable({
  rows,
  isLoading = false,
  onDownload,
  isDownloading = false,
}: {
  rows: ProcurementPurchaseOrderListItem[];
  isLoading?: boolean;
  onDownload: (purchaseOrderId: string) => void;
  isDownloading?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'generatedAt', desc: true }]);

  const columns = useMemo(
    () => [
      purchaseOrderColumnHelper.accessor('poNumber', {
        header: 'PO Number',
        enableSorting: true,
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-[#111827]">{info.getValue()}</p>
            <p className="truncate text-[13px] text-[#6b7280]">{info.row.original.fileName}</p>
          </div>
        ),
      }),
      purchaseOrderColumnHelper.accessor('requestLabel', {
        header: 'Requisition',
        enableSorting: true,
        cell: (info) => (
          <span className="block truncate text-[14px] text-[#111827]">{info.getValue() ?? '—'}</span>
        ),
      }),
      purchaseOrderColumnHelper.accessor('assetName', {
        header: 'Asset / Request',
        enableSorting: true,
        cell: (info) => (
          <span className="block truncate text-[14px] text-[#111827]">{info.getValue() ?? 'Asset Purchase'}</span>
        ),
      }),
      purchaseOrderColumnHelper.accessor('status', {
        header: 'Status',
        enableSorting: true,
        cell: (info) => (
          <Badge className={cn('border', PURCHASE_ORDER_STATUS_STYLES[info.getValue()] ?? STATUS_STYLES.DRAFT)}>
            {humanize(info.getValue())}
          </Badge>
        ),
      }),
      purchaseOrderColumnHelper.accessor('generatedByName', {
        header: 'Generated By',
        enableSorting: true,
        cell: (info) => (
          <span className="block truncate text-[14px] text-[#111827]">{info.getValue() ?? 'Unknown'}</span>
        ),
      }),
      purchaseOrderColumnHelper.accessor((row) => row.recipientName ?? row.recipientEmail, {
        id: 'recipient',
        header: 'Recipient',
        enableSorting: true,
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate text-[14px] text-[#111827]">{info.getValue() ?? 'Not emailed'}</p>
            <p className="truncate text-[13px] text-[#6b7280]">{info.row.original.recipientEmail || 'No recipient email'}</p>
          </div>
        ),
      }),
      purchaseOrderColumnHelper.accessor('generatedAt', {
        header: 'Generated At',
        enableSorting: true,
        cell: (info) => (
          <span className="text-[14px] text-[#111827]">{formatDate(info.getValue())}</span>
        ),
      }),
      purchaseOrderColumnHelper.display({
        id: 'action',
        header: '',
        cell: (info) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-[#0066cc] hover:bg-[#eff6ff] hover:text-[#0057ad]"
              onClick={(event) => {
                event.stopPropagation();
                onDownload(info.row.original.id);
              }}
              aria-label={`Download ${info.row.original.poNumber}`}
              disabled={isDownloading}
            >
              <Download className="size-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [isDownloading, onDownload],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white">
      <Table className="min-w-[1120px] table-fixed">
        <colgroup>
          {PURCHASE_ORDER_COLUMN_WIDTHS.map((width, index) => (
            <col key={`${index}-${width}`} style={{ width }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-black/[0.04] bg-canvas/50 hover:bg-canvas/50">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-auto px-4 py-3 text-center text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
                    header.column.id === 'poNumber' ? 'text-left' : '',
                    header.column.id === 'action' ? 'w-12' : '',
                  )}
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-1 select-none',
                        header.column.id === 'poNumber' ? 'justify-start text-left' : 'justify-center',
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'size-3 -mb-1',
                            header.column.getIsSorted() === 'asc' ? 'text-[#111827]' : 'text-[#d1d5db]',
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'size-3',
                            header.column.getIsSorted() === 'desc' ? 'text-[#111827]' : 'text-[#d1d5db]',
                          )}
                        />
                      </span>
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            PURCHASE_ORDER_TABLE_SKELETON_IDS.map((id) => (
              <TableRow key={id} className="border-b border-black/[0.04] hover:bg-transparent">
                <TableCell colSpan={8} className="px-4 py-4">
                  <div className="h-10 animate-pulse rounded-xl bg-neutral-100" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b border-black/[0.04] hover:bg-black/[0.02]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'px-4 py-4 text-center',
                      cell.column.id === 'poNumber' ? 'text-left' : '',
                      cell.column.id === 'action' ? 'w-12' : '',
                    )}
                  >
                    <div className="min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="px-4 py-12 text-center text-[14px] text-[#6b7280]">
                Generated purchase orders will appear here after Finance issues them.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!isLoading && table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between border-t border-black/[0.04] px-6 py-4">
          <span className="text-[12px] font-medium text-[#6b7280]">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 rounded-lg border-[#e5e7eb] px-3 text-[12px]"
            >
              Prev
            </Button>
            {Array.from({ length: table.getPageCount() }).map((_, index) => (
              <Button
                key={`po-page-${index}`}
                variant={table.getState().pagination.pageIndex === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => table.setPageIndex(index)}
                className={cn(
                  'h-8 min-w-8 rounded-lg px-2 text-[12px]',
                  table.getState().pagination.pageIndex === index
                    ? 'bg-[#111827] text-white hover:bg-[#111827]'
                    : 'border-[#e5e7eb] text-[#6b7280]',
                )}
              >
                {index + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 rounded-lg border-[#e5e7eb] px-3 text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RequisitionTable({
  orgSlug,
  rows,
  isLoading = false,
  onOpen,
  onCancel,
}: {
  orgSlug: string;
  rows: ProcurementRequisitionRecord[];
  isLoading?: boolean;
  onOpen: (row: ProcurementRequisitionRecord) => void;
  onCancel?: (requisitionId: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const columns = useMemo(
    () => [
      requisitionColumnHelper.accessor('requestLabel', {
        id: 'request',
        header: 'Request',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-[#111827]">{row.requestLabel ?? row.id}</p>
              <p className="truncate text-[13px] text-[#6b7280]">
                {row.assetName ?? row.assetCode ?? 'Asset Purchase'}
              </p>
            </div>
          );
        },
      }),
      requisitionColumnHelper.accessor('requestType', {
        header: 'Type',
        enableSorting: true,
        cell: (info) => (
          <span className="text-[14px] text-[#111827]">{humanize(info.getValue())}</span>
        ),
      }),
      requisitionColumnHelper.accessor('raisedByName', {
        header: 'Requester',
        enableSorting: true,
        cell: (info) => (
          <span className="block truncate text-[14px] text-[#111827]">
            {info.getValue() ?? 'Unknown'}
          </span>
        ),
      }),
      requisitionColumnHelper.accessor('estimatedTotalCost', {
        header: 'Spend',
        enableSorting: true,
        cell: (info) => (
          <span className="text-[14px] text-[#111827]">{formatProcurementCurrency(info.getValue())}</span>
        ),
      }),
      requisitionColumnHelper.accessor('status', {
        header: 'Status',
        enableSorting: true,
        cell: (info) => (
          <Badge className={cn('border', STATUS_STYLES[info.getValue()] ?? STATUS_STYLES.DRAFT)}>
            {humanize(info.getValue())}
          </Badge>
        ),
      }),
      requisitionColumnHelper.accessor('createdAt', {
        header: 'Created',
        enableSorting: true,
        cell: (info) => (
          <span className="text-[14px] text-[#111827]">{formatDate(info.getValue())}</span>
        ),
      }),
      requisitionColumnHelper.accessor((row) => row.ticketSnapshot?.ticketId ?? null, {
        id: 'linkedTicket',
        header: 'Linked Ticket',
        enableSorting: true,
        cell: (info) => (
          <span className="block truncate text-[14px] text-[#111827]">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      requisitionColumnHelper.display({
        id: 'action',
        header: '',
        cell: (info) => {
          const row = info.row.original;
          const canCancel = Boolean(onCancel && row.status !== 'CANCELLED' && row.status !== 'APPROVED');
          return (
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg text-[#6b7280] hover:bg-black/5 hover:text-[#111827]"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Open actions for ${row.requestLabel ?? row.id}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onOpen(row)}>
                    View details
                  </DropdownMenuItem>
                  {row.status === 'APPROVED' ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/${orgSlug}/procurement/purchase-orders/${row.id}`}>
                        Open PO composer
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {canCancel ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        void onCancel?.(row.id);
                      }}
                    >
                      Cancel requisition
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ],
    [onCancel, onOpen, orgSlug],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white">
      <Table className="min-w-[960px] table-fixed">
        <colgroup>
          {REQUISITION_COLUMN_WIDTHS.map((width, index) => (
            <col key={`${index}-${width}`} style={{ width }} />
          ))}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-black/[0.04] bg-canvas/50 hover:bg-canvas/50">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-auto px-4 py-3 text-center text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
                    header.column.id === 'request' ? 'text-left' : '',
                    header.column.id === 'action' ? 'w-12' : '',
                  )}
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-1 select-none',
                        header.column.id === 'request' ? 'justify-start text-left' : 'justify-center',
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'size-3 -mb-1',
                            header.column.getIsSorted() === 'asc' ? 'text-[#111827]' : 'text-[#d1d5db]',
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'size-3',
                            header.column.getIsSorted() === 'desc' ? 'text-[#111827]' : 'text-[#d1d5db]',
                          )}
                        />
                      </span>
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            REQUISITION_TABLE_SKELETON_IDS.map((id) => (
              <TableRow key={id} className="border-b border-black/[0.04] hover:bg-transparent">
                <TableCell colSpan={8} className="px-4 py-4">
                  <div className="h-10 animate-pulse rounded-xl bg-neutral-100" />
                </TableCell>
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer border-b border-black/[0.04] hover:bg-black/[0.02]"
                onClick={() => onOpen(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'px-4 py-4 text-center',
                      cell.column.id === 'request' ? 'text-left' : '',
                      cell.column.id === 'action' ? 'w-12' : '',
                    )}
                  >
                    <div className="min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="px-4 py-12 text-center text-[14px] text-[#6b7280]">
                No requisitions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {!isLoading && table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between border-t border-black/[0.04] px-6 py-4">
          <span className="text-[12px] font-medium text-[#6b7280]">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 rounded-lg border-[#e5e7eb] px-3 text-[12px]"
            >
              Prev
            </Button>
            {Array.from({ length: table.getPageCount() }).map((_, index) => (
              <Button
                key={`page-${index}`}
                variant={table.getState().pagination.pageIndex === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => table.setPageIndex(index)}
                className={cn(
                  'h-8 min-w-8 rounded-lg px-2 text-[12px]',
                  table.getState().pagination.pageIndex === index
                    ? 'bg-[#111827] text-white hover:bg-[#111827]'
                    : 'border-[#e5e7eb] text-[#6b7280]',
                )}
              >
                {index + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 rounded-lg border-[#e5e7eb] px-3 text-[12px]"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
