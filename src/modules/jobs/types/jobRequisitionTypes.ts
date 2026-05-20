export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
] as const;

export const JOB_REQUISITION_STATUSES = [
  'DRAFT',
  'PENDING',
  'PENDING_APPROVAL',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
  'ACTIVE_HIRING',
  'FILLED',
  'CLOSED',
  'ARCHIVED',
] as const;

export const REQUISITION_APPROVAL_DECISIONS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
] as const;

export const HIRING_REASONS = [
  'NEW_ROLE',
  'REPLACEMENT',
  'TEAM_EXPANSION',
  'URGENT_REQUIREMENT',
  'INTERNAL_TRANSFER',
  'CLIENT_REQUIREMENT',
] as const;

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const SALARY_VISIBILITY_OPTIONS = ['INTERNAL_ONLY', 'PUBLIC'] as const;

export const EXPERIENCE_LEVELS = [
  'ENTRY',
  'JUNIOR',
  'MID',
  'SENIOR',
  'STAFF',
  'PRINCIPAL',
  'LEAD',
  'HEAD',
  'EXECUTIVE',
] as const;

export const PIPELINE_STAGE_TYPES = [
  'DEFAULT',
  'INTERVIEW',
  'OFFER',
  'HIRED',
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
  hiringReason: (typeof HIRING_REASONS)[number] | null;
  priority: (typeof PRIORITIES)[number];
  replacementForId: string | null;
  replacementForName: string | null;
  businessJustification: string | null;
  salaryVisibility: (typeof SALARY_VISIBILITY_OPTIONS)[number];
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number] | null;
  minExperience: number | null;
  education: string | null;
  certifications: string[];
  roleSummary: string | null;
  responsibilities: string | null;
  requirementsRich: string | null;
  benefits: string | null;
  aboutTeam: string | null;
  requisitionNumber: number | null;
  requisitionLabel: string | null;
  canEdit: boolean;
}

export interface JobDepartmentOption {
  id: string;
  name: string;
}

export interface RequisitionActivityEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  fieldChanges: Record<string, unknown> | null;
  comment: string | null;
  createdAt: string;
}

export interface OrgMemberOption {
  id: string;
  name: string;
  email: string;
}

export interface PipelineStageRecord {
  id: string;
  jobPostingId: string;
  name: string;
  slug: string;
  order: number;
  color: string | null;
  isDefault: boolean;
  isFinal: boolean;
  stageType: (typeof PIPELINE_STAGE_TYPES)[number];
  meetingEnabled: boolean;
  offerLetterEnabled: boolean;
  evaluationEnabled: boolean;
  sheetEnabled?: boolean;
  evaluationType: 'NUMERIC' | 'TEXT' | 'CHECKBOX' | null;
  evaluationIncludeTotal: boolean;
  evaluationIncludeAnalysis: boolean;
  dueDate: string | null;
  extendToNextWorkingDay: boolean;
  evaluationCategories: StageEvaluationCategory[];
}

export interface PipelineBoardData {
  jobPostingId: string;
  stages: PipelineStageRecord[];
}

export interface StageEvaluationCategory {
  id: string;
  stageId: string;
  name: string;
  type: 'NUMERIC' | 'TEXT' | 'CHECKBOX';
  maxScore?: number | null;
  order: number;
}

export interface StageEvaluationCategoryInput {
  id?: string | null;
  name: string;
  type: 'NUMERIC' | 'TEXT' | 'CHECKBOX';
  order?: number;
}

export interface ImportableJobPosting {
  id: string;
  title: string;
  departmentName: string | null;
  stageCount: number;
  stages: PipelineStageRecord[];
}
