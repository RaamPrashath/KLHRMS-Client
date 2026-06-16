'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Package2, Search, MessageSquarePlus, Wrench, Grid, AlertCircle, Info, Send, Package } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn } from '@/lib/utils';
import { formatDate, humanize, readError } from '@/modules/assets/lib/assetUtils';
import { assetMaintenanceTypeOptions, helpdeskCategoryOptions } from '@/modules/assets/schema/assetSchemas';
import { useEmployeeAssetViewQuery } from '@/modules/assets/hooks/useAssetsQuery';
import { useHelpdeskMutations } from '@/modules/helpdesk/hooks/useHelpdeskMutations';
import { useHelpdeskTicketsQuery } from '@/modules/helpdesk/hooks/useHelpdeskTicketsQuery';
import { generalHelpRequestSchema } from '@/modules/helpdesk/schema/helpdeskSchemas';
import type { HelpdeskTicket, HelpdeskTicketKind, HelpdeskTicketStatus } from '@/modules/helpdesk/types/helpdeskTypes';

const assetRequestSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(160),
  issueDescription: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  maintenanceType: z.enum(assetMaintenanceTypeOptions),
});

type GeneralRequestValues = z.input<typeof generalHelpRequestSchema>;
type AssetRequestValues = z.input<typeof assetRequestSchema>;
type RequestMode = 'GENERAL' | 'ASSET';

const statusFilterOptions: Array<'ALL' | HelpdeskTicketStatus> = ['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const kindFilterOptions: Array<'ALL' | HelpdeskTicketKind> = ['ALL', 'GENERAL_HELP', 'ASSET_ISSUE'];

const helpdeskCategoryOptionsFiltered = (scope: string) =>
  scope === 'organization' ? [...helpdeskCategoryOptions] : [...SELF_SCOPE_CATEGORIES];

const statusTone: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-neutral-100 text-neutral-600',
};

const statusDotColor: Record<string, string> = {
  OPEN: 'bg-blue-600',
  IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-600',
  CANCELLED: 'bg-neutral-400',
};

const kindTone: Record<string, string> = {
  GENERAL_HELP: 'bg-slate-100 text-slate-700',
  ASSET_ISSUE: 'bg-[#f3f7ff] text-[#2454a6]',
};

function statusLabel(status: string) {
  if (status === 'COMPLETED') return 'Done';
  return humanize(status);
}

function kindLabel(kind: HelpdeskTicketKind) {
  return kind === 'ASSET_ISSUE' ? 'Asset request' : 'General help';
}

function normalizeText(ticket: HelpdeskTicket) {
  return [
    ticket.ticketId,
    ticket.subject,
    ticket.description,
    ticket.categoryName ?? '',
    ticket.assetName ?? '',
    ticket.assetCode ?? '',
    ticket.maintenanceType ?? '',
    ticket.kind,
    ticket.status,
  ]
    .join(' ')
    .toLowerCase();
}

function filterTickets(tickets: HelpdeskTicket[], search: string, statusFilter: string, kindFilter: string) {
  let result = tickets;

  if (search.trim()) {
    const query = search.toLowerCase().trim();
    result = result.filter((ticket) => normalizeText(ticket).includes(query));
  }

  if (statusFilter !== 'ALL') {
    result = result.filter((ticket) => ticket.status === statusFilter);
  }

  if (kindFilter !== 'ALL') {
    result = result.filter((ticket) => ticket.kind === kindFilter);
  }

  return result;
}

const SELF_SCOPE_CATEGORIES = ['GENERAL', 'HR_QUERIES'] as const;

export function HelpdeskPageShell({
  orgSlug,
  memberId,
  helpdeskScope = 'self',
}: {
  orgSlug: string;
  memberId: string;
  helpdeskScope?: string;
}) {
  const ticketsQuery = useHelpdeskTicketsQuery(orgSlug, memberId);
  const employeeAssetsQuery = useEmployeeAssetViewQuery(orgSlug, memberId);
  const mutations = useHelpdeskMutations(orgSlug, memberId);

  const [activeTab, setActiveTab] = useState<'raise' | 'tickets'>('raise');
  const [requestMode, setRequestMode] = useState<RequestMode>('GENERAL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HelpdeskTicketStatus>('ALL');
  const [kindFilter, setKindFilter] = useState<'ALL' | HelpdeskTicketKind>('ALL');
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeTabIdx = activeTab === 'raise' ? 0 : 1;

  useEffect(() => {
    const container = tabContainerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeTabIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setTabIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeTabIdx]);

  const generalForm = useForm<GeneralRequestValues>({
    resolver: zodResolver(generalHelpRequestSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
    },
  });

  const assetForm = useForm<AssetRequestValues>({
    resolver: zodResolver(assetRequestSchema),
    defaultValues: {
      assetId: '',
      subject: 'Asset issue request',
      issueDescription: '',
      maintenanceType: 'REPAIR',
    },
  });

  const categoryOptions = useMemo(
    () => helpdeskCategoryOptionsFiltered(helpdeskScope),
    [helpdeskScope],
  );

  const tickets = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const currentAssets = useMemo(() => employeeAssetsQuery.data?.current ?? [], [employeeAssetsQuery.data]);

  const filteredTickets = useMemo(
    () => filterTickets(tickets, search, statusFilter, kindFilter),
    [tickets, search, statusFilter, kindFilter],
  );

  const summary = useMemo(
    () => ({
      total: filteredTickets.length,
      open: filteredTickets.filter((ticket) => ticket.status === 'OPEN').length,
      inProgress: filteredTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
      done: filteredTickets.filter((ticket) => ticket.status === 'COMPLETED').length,
      cancelled: filteredTickets.filter((ticket) => ticket.status === 'CANCELLED').length,
    }),
    [filteredTickets],
  );

  useEffect(() => {
    if (requestMode !== 'ASSET') return;
    if (assetForm.getValues('assetId')) return;
    const firstAsset = currentAssets[0];
    if (firstAsset) {
      assetForm.setValue('assetId', firstAsset.assetId, { shouldValidate: assetForm.formState.isSubmitted });
    }
  }, [assetForm, currentAssets, requestMode]);

  async function submitGeneral(values: GeneralRequestValues) {
    try {
      await mutations.createGeneralHelp.mutateAsync(values);
      toast.success('General request submitted');
      generalForm.reset({
        subject: '',
        description: '',
        category: 'GENERAL',
        priority: 'MEDIUM',
      });
      setActiveTab('tickets');
    } catch (error) {
      toast.error(readError(error, 'Failed to submit request'));
    }
  }

  async function submitAsset(values: AssetRequestValues) {
    try {
      await mutations.createAssetRequest.mutateAsync({
        ticketMode: 'ASSET_ISSUE',
        assetId: values.assetId,
        assetUnitId: null,
        category: null,
        subject: values.subject,
        issueDescription: values.issueDescription,
        attachmentsMetadata: [],
        maintenanceType: values.maintenanceType,
        serviceDate: new Date().toISOString().slice(0, 10),
        expectedCompletionDate: '',
        estimatedDowntimeHours: null,
        operationalCriticalityTier: 'STANDARD',
        conditionBeforeMaintenance: null,
        notes: '',
      });
      toast.success('Asset request submitted');
      assetForm.reset({
        assetId: currentAssets[0]?.assetId ?? '',
        subject: 'Asset issue request',
        issueDescription: '',
        maintenanceType: 'REPAIR',
      });
      setActiveTab('tickets');
    } catch (error) {
      toast.error(readError(error, 'Failed to submit request'));
    }
  }

  async function withdrawTicket(ticketId: string) {
    try {
      await mutations.withdrawTicket.mutateAsync(ticketId);
      toast.success('Request withdrawn');
    } catch (error) {
      toast.error(readError(error, 'Failed to withdraw request'));
    }
  }

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== 'ALL' || kindFilter !== 'ALL';
  const assetRequestDisabled = currentAssets.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Top Title Breadcrumb */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Helpdesk Support</h1>
          <p className="text-sm text-slate-500 mt-0.5">Submit ticket requests directly to operational or infrastructure admins.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'raise' | 'tickets')} className="min-h-0 flex-1 gap-5">
        <div
          ref={tabContainerRef}
          className="mb-5 flex items-center self-start w-fit rounded-xl bg-neutral-50 p-1 border border-black/4 relative"
        >
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ left: tabIndicatorStyle.left, width: tabIndicatorStyle.width }}
          />
          <button
            data-tab-index={0}
            type="button"
            onClick={() => setActiveTab('raise')}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-5 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
              activeTab === 'raise'
                ? 'text-primary font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium',
            )}
          >
            Raise request
          </button>
          <button
            data-tab-index={1}
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-5 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200',
              activeTab === 'tickets'
                ? 'text-primary font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium',
            )}
          >
            Raised tickets
          </button>
        </div>

        <TabsContent value="raise" className="min-h-0">
          <div className="max-w-3xl">
            <main className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              {/* Custom Styled Segmented Tabs */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRequestMode('GENERAL')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl transition-all border',
                    requestMode === 'GENERAL'
                      ? 'bg-white text-slate-900 shadow-sm border-slate-200/50 font-semibold'
                      : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent font-medium',
                  )}
                >
                  <MessageSquarePlus className={cn('size-4', requestMode === 'GENERAL' ? 'text-blue-600' : 'text-slate-400')} />
                  General request
                </button>
                <button
                  type="button"
                  onClick={() => setRequestMode('ASSET')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm rounded-xl transition-all border',
                    requestMode === 'ASSET'
                      ? 'bg-white text-slate-900 shadow-sm border-slate-200/50 font-semibold'
                      : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent font-medium',
                  )}
                >
                  <Wrench className={cn('size-4', requestMode === 'ASSET' ? 'text-blue-600' : 'text-slate-400')} />
                  Asset request
                </button>
              </div>

              {requestMode === 'GENERAL' ? (
                <form className="p-6 md:p-8 space-y-6" onSubmit={generalForm.handleSubmit(submitGeneral)} noValidate>
                  {/* Subject Input */}
                  <div className="space-y-2">
                    <label htmlFor="helpdesk-subject" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Subject
                    </label>
                    <Input
                      id="helpdesk-subject"
                      placeholder="e.g. Payroll correction request"
                      className="w-full px-4 py-3 h-11 border border-slate-200 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 font-medium shadow-none focus:border-blue-500"
                      {...generalForm.register('subject')}
                    />
                    {generalForm.formState.isSubmitted && generalForm.formState.errors.subject ? (
                      <p className="text-xs text-destructive-text">{generalForm.formState.errors.subject.message}</p>
                    ) : null}
                  </div>

                  {/* Grid Options Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Selection */}
                    <div className="space-y-2">
                      <label htmlFor="helpdesk-category" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Category
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 z-10">
                          <Grid className="size-4" />
                        </span>
                        <Select
                          value={generalForm.watch('category')}
                          onValueChange={(value) => generalForm.setValue('category', value, { shouldValidate: generalForm.formState.isSubmitted })}
                        >
                          <SelectTrigger
                            id="helpdesk-category"
                            className="w-full pl-10 pr-10 py-3 h-11 border border-slate-200 rounded-xl text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all text-slate-700 font-medium cursor-pointer shadow-none"
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {humanize(option)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {generalForm.formState.isSubmitted && generalForm.formState.errors.category ? (
                        <p className="text-xs text-destructive-text">{generalForm.formState.errors.category.message}</p>
                      ) : null}
                    </div>

                    {/* Priority Level Selection */}
                    <div className="space-y-2">
                      <label htmlFor="helpdesk-priority" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Priority Level
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 z-10">
                          <AlertCircle
                            className={cn(
                              'size-4 transition-colors duration-200',
                              generalForm.watch('priority') === 'LOW' ? 'text-slate-400' :
                              generalForm.watch('priority') === 'MEDIUM' ? 'text-amber-500' :
                              generalForm.watch('priority') === 'HIGH' ? 'text-orange-500' : 'text-red-500'
                            )}
                          />
                        </span>
                        <Select
                          value={generalForm.watch('priority')}
                          onValueChange={(value) => generalForm.setValue('priority', value as GeneralRequestValues['priority'], { shouldValidate: generalForm.formState.isSubmitted })}
                        >
                          <SelectTrigger
                            id="helpdesk-priority"
                            className="w-full pl-10 pr-10 py-3 h-11 border border-slate-200 rounded-xl text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all text-slate-700 font-medium cursor-pointer shadow-none"
                          >
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((option) => (
                              <SelectItem key={option} value={option}>
                                {humanize(option)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {generalForm.formState.isSubmitted && generalForm.formState.errors.priority ? (
                        <p className="text-xs text-destructive-text">{generalForm.formState.errors.priority.message}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <label htmlFor="helpdesk-description" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Description
                    </label>
                    <Textarea
                      id="helpdesk-description"
                      placeholder="Explain the issue, what you need, and any context the admin should know."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 resize-none font-medium leading-relaxed min-h-[140px] shadow-none"
                      {...generalForm.register('description')}
                    />
                    {generalForm.formState.isSubmitted && generalForm.formState.errors.description ? (
                      <p className="text-xs text-destructive-text">{generalForm.formState.errors.description.message}</p>
                    ) : null}
                  </div>

                  {/* Bottom Sticky Footer Actions inside Card */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-2 text-xs text-slate-400 font-medium max-w-md">
                      <Info className="size-4 text-slate-300 shrink-0 mt-0.5" />
                      <p>General requests stay in Helpdesk queues and can be tracked anytime from the secondary activity tabs.</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={generalForm.formState.isSubmitting || mutations.createGeneralHelp.isPending}
                      className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 h-11 rounded-xl shadow-md shadow-blue-500/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {generalForm.formState.isSubmitting || mutations.createGeneralHelp.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" /> Submit request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <form className="p-6 md:p-8 space-y-6" onSubmit={assetForm.handleSubmit(submitAsset)} noValidate>
                  {/* Alert Info Banner */}
                  <div className="text-xs bg-slate-50 text-slate-600 px-4 py-3 rounded-xl border border-slate-200/60 flex items-start gap-2.5 leading-relaxed font-medium">
                    <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Raise an asset request for a laptop, monitor, badge, or replacement issue. This goes straight to Asset Maintenance.</span>
                  </div>

                  {/* Grid Options Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Asset Selection */}
                    <div className="space-y-2">
                      <label htmlFor="asset-request-asset" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Asset
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 z-10">
                          <Package className="size-4" />
                        </span>
                        <Select
                          value={assetForm.watch('assetId')}
                          onValueChange={(value) => assetForm.setValue('assetId', value, { shouldValidate: assetForm.formState.isSubmitted })}
                          disabled={assetRequestDisabled}
                        >
                          <SelectTrigger
                            id="asset-request-asset"
                            className="w-full pl-10 pr-10 py-3 h-11 border border-slate-200 rounded-xl text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all text-slate-700 font-medium cursor-pointer shadow-none"
                          >
                            <SelectValue placeholder={assetRequestDisabled ? 'No assigned assets found' : 'Select asset'} />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAssets.map((asset) => (
                              <SelectItem key={asset.assetId} value={asset.assetId}>
                                {asset.name} ({asset.assetCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {assetForm.formState.isSubmitted && assetForm.formState.errors.assetId ? (
                        <p className="text-xs text-destructive-text">{assetForm.formState.errors.assetId.message}</p>
                      ) : null}
                      {assetRequestDisabled ? (
                        <p className="text-xs text-muted-foreground">
                          You need an assigned asset before raising an asset request.
                        </p>
                      ) : null}
                    </div>

                    {/* Issue Type Selection */}
                    <div className="space-y-2">
                      <label htmlFor="asset-request-type" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Issue Type
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 z-10">
                          <Wrench className="size-4" />
                        </span>
                        <Select
                          value={assetForm.watch('maintenanceType')}
                          onValueChange={(value) => assetForm.setValue('maintenanceType', value as AssetRequestValues['maintenanceType'], { shouldValidate: assetForm.formState.isSubmitted })}
                        >
                          <SelectTrigger
                            id="asset-request-type"
                            className="w-full pl-10 pr-10 py-3 h-11 border border-slate-200 rounded-xl text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all text-slate-700 font-medium cursor-pointer shadow-none"
                          >
                            <SelectValue placeholder="Select issue type" />
                          </SelectTrigger>
                          <SelectContent>
                            {assetMaintenanceTypeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {humanize(option)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {assetForm.formState.isSubmitted && assetForm.formState.errors.maintenanceType ? (
                        <p className="text-xs text-destructive-text">{assetForm.formState.errors.maintenanceType.message}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div className="space-y-2">
                    <label htmlFor="asset-request-subject" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Subject
                    </label>
                    <Input
                      id="asset-request-subject"
                      placeholder="e.g. Laptop charger not working"
                      className="w-full px-4 py-3 h-11 border border-slate-200 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 font-medium shadow-none focus:border-blue-500"
                      {...assetForm.register('subject')}
                    />
                    {assetForm.formState.isSubmitted && assetForm.formState.errors.subject ? (
                      <p className="text-xs text-destructive-text">{assetForm.formState.errors.subject.message}</p>
                    ) : null}
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <label htmlFor="asset-request-description" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Description
                    </label>
                    <Textarea
                      id="asset-request-description"
                      placeholder="Describe the hardware issue, replacement need, or damage in detail."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 resize-none font-medium leading-relaxed min-h-[140px] shadow-none"
                      {...assetForm.register('issueDescription')}
                    />
                    {assetForm.formState.isSubmitted && assetForm.formState.errors.issueDescription ? (
                      <p className="text-xs text-destructive-text">{assetForm.formState.errors.issueDescription.message}</p>
                    ) : null}
                  </div>

                  {/* Bottom Sticky Footer Actions inside Card */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-2 text-xs text-slate-400 font-medium max-w-md">
                      <Info className="size-4 text-slate-300 shrink-0 mt-0.5" />
                      <p>Asset requests are routed directly to asset maintenance and can be tracked anytime from the secondary activity tabs.</p>
                    </div>
                    <Button
                      type="submit"
                      disabled={assetRequestDisabled || assetForm.formState.isSubmitting || mutations.createAssetRequest.isPending}
                      className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 h-11 rounded-xl shadow-md shadow-blue-500/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {assetForm.formState.isSubmitting || mutations.createAssetRequest.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" /> Submit asset request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </main>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="min-h-0">
          <section className="rounded-2xl border border-[#e7ebf0] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center">
              <div className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 shadow-none transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <Search className="size-4 shrink-0 text-[#86868b]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tickets..."
                  className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-[#86868b]"
                />
              </div>

              <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
                <SelectTrigger className="h-9 w-full lg:w-[150px] rounded-xl border-[#e2e8f0] bg-white text-[13px] shadow-none">
                  <SelectValue placeholder="Types" />
                </SelectTrigger>
                <SelectContent>
                  {kindFilterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'ALL' ? 'Types' : kindLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="h-9 w-full lg:w-[150px] rounded-xl border-[#e2e8f0] bg-white text-[13px] shadow-none">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'ALL' ? 'Status' : statusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setKindFilter('ALL');
                  }}
                  className="h-9 rounded-xl px-4 text-sm text-[#6e6e73]"
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 overflow-x-auto border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-[#f8fafc] hover:bg-[#f8fafc]">
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-left">Ticket</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Type</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Item</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Description</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Created</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : ticketsQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <p className="text-sm font-medium text-foreground">We couldn’t load your requests.</p>
                          <p className="text-sm text-muted-foreground">{readError(ticketsQuery.error, 'Please try again.')}</p>
                          <Button variant="outline" onClick={() => void ticketsQuery.refetch()}>
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f3f7ff] text-[#2454a6]">
                            <Package2 className="size-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No matching requests</p>
                          <p className="max-w-sm text-sm text-muted-foreground">
                            {tickets.length === 0
                              ? 'Once you raise a request, it will appear here.'
                              : 'Try clearing filters or searching a different ticket.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="border-b border-border bg-white hover:bg-slate-50/50">
                        <TableCell className="px-6 py-4 align-middle text-left">
                          <span className="text-sm font-semibold text-foreground">{ticket.ticketId}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-center">
                          <span className="text-sm font-medium text-foreground">{kindLabel(ticket.kind)}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-center">
                          <div className="flex flex-col gap-0.5 items-center">
                            <span className="text-sm font-medium text-foreground">
                              {ticket.kind === 'ASSET_ISSUE' ? ticket.assetName ?? 'Asset request' : ticket.categoryName ?? 'General'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {ticket.kind === 'ASSET_ISSUE'
                                ? ticket.assetCode ?? 'Asset code unavailable'
                                : ticket.categoryName
                                  ? humanize(ticket.categoryName)
                                  : 'General support'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-center">
                          <p className="max-w-[16rem] mx-auto truncate text-sm text-muted-foreground" title={ticket.description}>
                            {ticket.description}
                          </p>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-center">
                          <span className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                            <span className={cn('size-2 rounded-full', statusDotColor[ticket.status] ?? 'bg-neutral-400')} />
                            {statusLabel(ticket.status)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-center text-sm text-muted-foreground">
                          {formatDate(ticket.createdAt)}
                        </TableCell>
                        <TableCell className="px-6 py-4 align-middle text-right">
                          {ticket.status === 'OPEN' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawTargetId(ticket.id)}
                              disabled={mutations.withdrawTicket.isPending}
                              className="rounded-lg"
                            >
                              Withdraw
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Locked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={withdrawTargetId !== null}
        onOpenChange={(open) => { if (!open) setWithdrawTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (withdrawTargetId) {
                  await withdrawTicket(withdrawTargetId);
                  setWithdrawTargetId(null);
                }
              }}
              disabled={mutations.withdrawTicket.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mutations.withdrawTicket.isPending ? 'Withdrawing...' : 'Withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
