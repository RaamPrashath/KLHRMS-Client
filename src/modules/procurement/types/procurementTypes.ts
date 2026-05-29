export const PROCUREMENT_REQUEST_TYPES = ['BULK', 'REPLACEMENT'] as const;
export const PROCUREMENT_STATUSES = [
  'DRAFT',
  'PENDING_FINANCE_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export const PROCUREMENT_URGENCY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const PROCUREMENT_PO_FORMATS = ['STANDARD'] as const;

export type ProcurementRequestType = (typeof PROCUREMENT_REQUEST_TYPES)[number];
export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number];
export type ProcurementUrgency = (typeof PROCUREMENT_URGENCY)[number];
export type ProcurementPoFormat = (typeof PROCUREMENT_PO_FORMATS)[number];

export interface ProcurementDepartmentOption {
  id: string;
  name: string;
}

export interface ProcurementCategoryOption {
  id: string;
  name: string;
  assetCode: string | null;
}

export interface ProcurementReplacementTicketOption {
  id: string;
  ticketId: string;
  subject: string | null;
  issueDescription: string;
  status: string;
  serviceDate: string;
  maintenanceType: string;
  assetId: string | null;
  assetUnitId: string | null;
  assetName: string | null;
  assetCode: string | null;
  serialNumber: string | null;
  currentCondition: string | null;
  originalPurchaseDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyStatus: string;
  affectedEmployeeId: string | null;
  affectedEmployeeName: string | null;
  raisedByName: string | null;
  replacementMode: string | null;
  createdAt: string;
}

export interface ProcurementMetaResponse {
  departments: ProcurementDepartmentOption[];
  categories: ProcurementCategoryOption[];
  replacementTickets: ProcurementReplacementTicketOption[];
}

export interface ProcurementAdminRecipientOption {
  memberId: string;
  name: string;
  email: string;
}

export interface ProcurementAdminRecipientsResponse {
  items: ProcurementAdminRecipientOption[];
}

export interface ProcurementActivityEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  comment: string | null;
  createdAt: string;
}

export interface ProcurementPurchaseOrderRecord {
  id: string;
  poNumber: string;
  formatKey: ProcurementPoFormat;
  status: 'GENERATED' | 'SENT' | 'FAILED' | 'CANCELLED';
  storageBucket: string;
  storagePath: string;
  fileName: string;
  recipientMemberId: string | null;
  recipientName: string | null;
  recipientEmail: string;
  generatedByMemberId: string | null;
  generatedByName: string | null;
  generatedAt: string;
  sentAt: string | null;
  emailSubject: string | null;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementSnapshotRead {
  ticketId?: string | null;
  subject?: string | null;
  issueDescription?: string | null;
  status?: string | null;
  createdAt?: string | null;
  serviceDate?: string | null;
  maintenanceType?: string | null;
  assetName?: string | null;
  assetCode?: string | null;
  serialNumber?: string | null;
  affectedEmployeeName?: string | null;
  raisedByName?: string | null;
  currentCondition?: string | null;
  originalPurchaseDate?: string | null;
  warrantyExpiryDate?: string | null;
  warrantyStatus?: string | null;
  replacementMode?: string | null;
}

export interface ProcurementRequisitionRecord {
  id: string;
  requestType: ProcurementRequestType;
  status: ProcurementStatus;
  requestNumber: number | null;
  requestLabel: string | null;
  raisedByMemberId: string;
  raisedByName: string | null;
  approvedByMemberId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  reviewerComment: string | null;
  justification: string;
  requiredByDate: string | null;
  estimatedUnitCost: number | null;
  estimatedQuantity: number | null;
  estimatedTotalCost: number | null;
  vendorPreference: string | null;
  urgency: string | null;
  costCenterOrDepartmentId: string | null;
  costCenterOrDepartmentName: string | null;
  assetName: string | null;
  assetCode: string | null;
  categoryDefinitionId: string | null;
  categoryName: string | null;
  specificationNotes: string | null;
  maintenanceTicketId: string | null;
  assetId: string | null;
  assetUnitId: string | null;
  affectedEmployeeId: string | null;
  affectedEmployeeName: string | null;
  originalPurchaseDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyStatus: string | null;
  replacementReason: string | null;
  replacementMode: string | null;
  ticketSnapshot: ProcurementSnapshotRead | null;
  assetSnapshot: ProcurementSnapshotRead | null;
  createdAt: string;
  updatedAt: string;
  currentUserCanApprove: boolean;
  canSubmit: boolean;
  approvalsPendingFinance: boolean;
  activities: ProcurementActivityEntry[];
  purchaseOrders: ProcurementPurchaseOrderRecord[];
}

export interface ProcurementListResponse {
  items: ProcurementRequisitionRecord[];
}
