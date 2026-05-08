export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
] as const;

export const JOB_REQUISITION_STATUSES = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CLOSED',
] as const;

export const REQUISITION_APPROVAL_DECISIONS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

export interface JobRequisitionApprovalSummary {
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCount: number;
}

export interface JobRequisitionApproval {
  id: string;
  approverId: string;
  approverName: string | null;
  decision: (typeof REQUISITION_APPROVAL_DECISIONS)[number];
  comment: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface JobRequisitionRecord {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  openings: number;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string | null;
  requirements: string | null;
  skills: string[];
  location: string | null;
  isRemote: boolean;
  raisedById: string;
  raisedByName: string | null;
  targetDate: string | null;
  status: (typeof JOB_REQUISITION_STATUSES)[number];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  approvalSummary: JobRequisitionApprovalSummary;
  currentUserApprovalDecision: (typeof REQUISITION_APPROVAL_DECISIONS)[number] | null;
  currentUserCanApprove: boolean;
  canSubmit: boolean;
  approvals: JobRequisitionApproval[];
}

export interface JobDepartmentOption {
  id: string;
  name: string;
}
