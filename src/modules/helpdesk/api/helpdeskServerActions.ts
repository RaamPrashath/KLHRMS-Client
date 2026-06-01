'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { generalHelpRequestSchema } from '@/modules/helpdesk/schema/helpdeskSchemas';
import type { GeneralHelpRequestInput, HelpdeskTicket } from '@/modules/helpdesk/types/helpdeskTypes';

function getApiUrl(): string {
  return getHrmsApiUrl();
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore non-JSON errors
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

interface ServerTicket {
  id: string;
  ticketId: string;
  ticketMode: string;
  assetId: string | null;
  assetName: string | null;
  assetCode: string | null;
  category: string | null;
  subject: string | null;
  issueDescription: string;
  status: string;
  serviceDate: string;
  createdAt: string;
}

function normalizeGeneralTicket(ticket: ServerTicket): HelpdeskTicket {
  return {
    id: ticket.id,
    ticketId: ticket.ticketId ?? ticket.id,
    kind: 'GENERAL_HELP',
    subject: ticket.subject ?? 'General help request',
    description: ticket.issueDescription ?? '',
    status: ticket.status ?? 'OPEN',
    priority: 'MEDIUM',
    categoryName: ticket.category ?? null,
    assetId: null,
    assetName: null,
    assetCode: null,
    createdAt: ticket.createdAt ?? new Date().toISOString(),
  };
}

export async function fetchMyGeneralHelpTicketsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<HelpdeskTicket[]> {
  const res = await fetch(`${getApiUrl()}/assets/tickets/mine`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });

  if (res.status === 404 || res.status === 405) return [];

  const tickets = await handleResponse<ServerTicket[]>(res);
  return tickets.filter((t) => t.ticketMode === 'GENERAL_HELP_REQUEST').map(normalizeGeneralTicket);
}

export async function createGeneralHelpTicketAction(params: {
  orgSlug: string;
  memberId: string;
  data: GeneralHelpRequestInput;
}): Promise<HelpdeskTicket> {
  const parsed = generalHelpRequestSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const res = await fetch(`${getApiUrl()}/assets/helpdesk`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      ticketMode: 'GENERAL_HELP_REQUEST',
      category: parsed.data.category,
      subject: parsed.data.subject,
      issueDescription: parsed.data.description,
      maintenanceType: 'REPAIR',
    }),
  });

  const ticket = await handleResponse<ServerTicket>(res);
  return normalizeGeneralTicket(ticket);
}

export async function withdrawHelpdeskTicketAction(params: {
  orgSlug: string;
  memberId: string;
  ticketId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/assets/tickets/mine/${params.ticketId}/withdraw`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  await handleResponse<ServerTicket>(res);
}
