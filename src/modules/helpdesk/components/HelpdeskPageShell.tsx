'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Laptop, LifeBuoy, Plus, Search, Send, TicketCheck } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAssetsQuery } from '@/modules/assets/hooks/useAssetsQuery';
import { assetMaintenanceTypeOptions } from '@/modules/assets/schema/assetSchemas';
import { formatDate, humanize, readError } from '@/modules/assets/lib/assetUtils';
import { useHelpdeskMutations } from '@/modules/helpdesk/hooks/useHelpdeskMutations';
import { useHelpdeskTicketsQuery } from '@/modules/helpdesk/hooks/useHelpdeskTicketsQuery';
import { helpdeskPriorityOptions } from '@/modules/helpdesk/schema/helpdeskSchemas';
import type { HelpdeskTicket, HelpdeskTicketPriority } from '@/modules/helpdesk/types/helpdeskTypes';

const generalCategories = ['HR Queries', 'IT Support', 'Finance', 'Facilities', 'General'];

const statusTone: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700 ring-red-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-100',
  PENDING_EMPLOYEE: 'bg-blue-50 text-blue-700 ring-blue-100',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  CLOSED: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  CANCELLED: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
};

const priorityTone: Record<string, string> = {
  LOW: 'text-neutral-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-amber-700',
  URGENT: 'text-red-700',
};

function isBackendMissing(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('"status":404') || error.message.includes('"status":405');
}

function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
      statusTone[status] ?? 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    )}>
      {humanize(status)}
    </span>
  );
}

function EmptyTickets() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d7dce2] bg-white py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-[#f3f7f5]">
        <TicketCheck className="size-5 text-[#00874a]" />
      </div>
      <p className="mt-3 text-[15px] font-semibold text-[#1d1d1f]">No tickets yet</p>
      <p className="mt-1 text-[13px] text-[#6e6e73]">Submitted asset issues and help requests will appear here.</p>
    </div>
  );
}

function TicketList({ tickets, isLoading }: { tickets: HelpdeskTicket[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | HelpdeskTicket['kind']>('ALL');

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesKind = kindFilter === 'ALL' || ticket.kind === kindFilter;
      const matchesSearch =
        !q ||
        ticket.ticketId.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        (ticket.assetCode ?? '').toLowerCase().includes(q);
      return matchesKind && matchesSearch;
    });
  }, [kindFilter, search, tickets]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">My Tickets</h2>
          <p className="text-[13px] text-[#6e6e73]">Asset issues and general help requests in one queue</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-9 min-w-64 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3">
            <Search className="size-4 text-[#9ca3af]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tickets..."
              className="h-auto border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
            />
          </div>
          <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
            <SelectTrigger className="h-9 w-full rounded-lg border-[#e5e7eb] bg-white text-[13px] shadow-none sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All tickets</SelectItem>
              <SelectItem value="ASSET_ISSUE">Asset issues</SelectItem>
              <SelectItem value="GENERAL_HELP">General help</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-3">
                <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                <div className="col-span-2 h-5 animate-pulse rounded bg-[#f3f4f6]" />
                <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyTickets />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-[#eef0f3] bg-[#f8faf9]">
                <tr>
                  {['Ticket', 'Type', 'Subject', 'Priority', 'Status', 'Created'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={`${ticket.kind}-${ticket.id}`} className="border-b border-[#f0f0f2] last:border-0">
                    <td className="px-4 py-3 text-[12px] font-semibold tabular-nums text-[#1d1d1f]">{ticket.ticketId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f7f5] px-2.5 py-1 text-[11px] font-semibold text-[#33624c]">
                        {ticket.kind === 'ASSET_ISSUE' ? <Laptop className="size-3" /> : <LifeBuoy className="size-3" />}
                        {ticket.kind === 'ASSET_ISSUE' ? 'Asset Issue' : 'General Help'}
                      </span>
                    </td>
                    <td className="max-w-80 px-4 py-3">
                      <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{ticket.subject}</p>
                      <p className="mt-0.5 truncate text-[12px] text-[#6e6e73]">
                        {ticket.assetCode ? `${ticket.assetCode} - ` : ''}{ticket.description}
                      </p>
                    </td>
                    <td className={cn('px-4 py-3 text-[12px] font-semibold', priorityTone[ticket.priority] ?? 'text-neutral-500')}>
                      {humanize(ticket.priority)}
                    </td>
                    <td className="px-4 py-3"><TicketStatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-[#6e6e73]">{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function HelpdeskPageShell({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const [assetId, setAssetId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('REPAIR');
  const [assetDescription, setAssetDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('IT Support');
  const [priority, setPriority] = useState<HelpdeskTicketPriority>('MEDIUM');
  const [generalDescription, setGeneralDescription] = useState('');

  const assetsQuery = useAssetsQuery(orgSlug, memberId, {
    currentHolderMemberId: memberId,
    page: 1,
    pageSize: 100,
  });
  const ticketsQuery = useHelpdeskTicketsQuery(orgSlug, memberId);
  const mutations = useHelpdeskMutations(orgSlug, memberId);

  const assignedAssets = useMemo(() => assetsQuery.data?.items ?? [], [assetsQuery.data?.items]);
  const assetIssueDisabled = !assetId || !assetDescription.trim() || mutations.createAssetIssue.isPending;
  const generalDisabled =
    subject.trim().length < 3 ||
    generalDescription.trim().length < 10 ||
    mutations.createGeneralHelp.isPending;

  async function submitAssetIssue() {
    if (assetIssueDisabled) return;
    try {
      await mutations.createAssetIssue.mutateAsync({
        assetId,
        maintenanceType: maintenanceType as (typeof assetMaintenanceTypeOptions)[number],
        issueDescription: assetDescription.trim(),
        serviceDate: new Date().toISOString().slice(0, 10),
        status: 'OPEN',
        conditionBeforeMaintenance: 'GOOD',
        notes: '',
      });
      setAssetId('');
      setMaintenanceType('REPAIR');
      setAssetDescription('');
      toast.success('Asset issue submitted');
    } catch (error) {
      toast.error(readError(error, 'Failed to submit asset issue'));
    }
  }

  async function submitGeneralHelp() {
    if (generalDisabled) return;
    try {
      await mutations.createGeneralHelp.mutateAsync({
        subject: subject.trim(),
        category,
        priority,
        description: generalDescription.trim(),
      });
      setSubject('');
      setCategory('IT Support');
      setPriority('MEDIUM');
      setGeneralDescription('');
      toast.success('Help request submitted');
    } catch (error) {
      if (isBackendMissing(error)) {
        toast.error('General help tickets need the Helpdesk API to be enabled.');
      } else {
        toast.error(readError(error, 'Failed to submit help request'));
      }
    }
  }

  const [activeTab, setActiveTab] = useState<'raise' | 'tickets'>('raise');

  const tabs = [
    { key: 'raise' as const, label: 'Raise Issue', icon: Plus },
    { key: 'tickets' as const, label: 'See Tickets', icon: TicketCheck },
  ];

  return (
    <div className="w-full" suppressHydrationWarning>
      <div className="mb-5 border-b border-[#e5e7eb] pb-4">
          <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">Helpdesk</h1>
            <p className="mt-1 text-[14px] text-[#6b7280]">Raise asset issues or general workplace support requests</p>
          </div>
        </div>
      </div>

      <div className="inline-flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                isActive
                  ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-neutral-500 hover:text-neutral-900',
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'raise' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <AlertCircle className="size-4.5 text-red-700" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Asset Issue</h2>
                <p className="text-[13px] text-[#6e6e73]">Report a problem with equipment assigned to you</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73]">Asset</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger className="h-10 rounded-lg border-[#e5e7eb] shadow-none">
                    <SelectValue placeholder={assetsQuery.isLoading ? 'Loading assets...' : 'Choose assigned asset'} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.assetCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73]">Issue Type</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger className="h-10 rounded-lg border-[#e5e7eb] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetMaintenanceTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>{humanize(option)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73]">Description</Label>
                <Textarea
                  value={assetDescription}
                  onChange={(event) => setAssetDescription(event.target.value)}
                  placeholder="Describe the issue with the asset..."
                  rows={5}
                  className="resize-none rounded-lg border-[#e5e7eb] shadow-none"
                />
              </div>

              <Button
                onClick={() => void submitAssetIssue()}
                disabled={assetIssueDisabled}
                className="h-10 w-full rounded-lg bg-[#b3261e] text-[14px] font-medium text-white hover:bg-[#9f211b]"
              >
                <Send className="mr-2 size-4" />
                Submit Asset Issue
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f6ef]">
                <LifeBuoy className="size-4.5 text-[#00874a]" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">General Help Request</h2>
                <p className="text-[13px] text-[#6e6e73]">Ask HR, IT, finance, or operations for support</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73]">Subject</Label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="What do you need help with?"
                  className="h-10 rounded-lg border-[#e5e7eb] shadow-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-[13px] text-[#6e6e73]">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 rounded-lg border-[#e5e7eb] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generalCategories.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[13px] text-[#6e6e73]">Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as HelpdeskTicketPriority)}>
                    <SelectTrigger className="h-10 rounded-lg border-[#e5e7eb] shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {helpdeskPriorityOptions.map((option) => (
                        <SelectItem key={option} value={option}>{humanize(option)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-[13px] text-[#6e6e73]">Description</Label>
                <Textarea
                  value={generalDescription}
                  onChange={(event) => setGeneralDescription(event.target.value)}
                  placeholder="Add the context the support team needs..."
                  rows={5}
                  className="resize-none rounded-lg border-[#e5e7eb] shadow-none"
                />
              </div>

              <Button
                onClick={() => void submitGeneralHelp()}
                disabled={generalDisabled}
                className="h-10 w-full rounded-lg bg-primary text-[14px] font-medium text-white hover:bg-primary-hover"
              >
                <Send className="mr-2 size-4" />
                Submit Help Request
              </Button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'tickets' && (
        <TicketList tickets={ticketsQuery.data ?? []} isLoading={ticketsQuery.isLoading} />
      )}
    </div>
  );
}
