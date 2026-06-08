export type HelpdeskTicketKind = 'ASSET_ISSUE' | 'GENERAL_HELP';

export type HelpdeskTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING_EMPLOYEE'
  | 'RESOLVED'
  | 'CLOSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type HelpdeskTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface HelpdeskTicket {
  id: string;
  ticketId: string;
  kind: HelpdeskTicketKind;
  subject: string;
  description: string;
  status: HelpdeskTicketStatus | string;
  priority: HelpdeskTicketPriority | string;
  categoryName: string | null;
  assetId: string | null;
  assetName: string | null;
  assetCode: string | null;
  maintenanceType?: string | null;
  createdAt: string;
}

export interface GeneralHelpRequestInput {
  subject: string;
  description: string;
  category: string;
  priority: HelpdeskTicketPriority;
}
