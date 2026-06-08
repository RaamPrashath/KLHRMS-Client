export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';

export interface LookupOption {
  id: string;
  label: string;
  email?: string | null;
}

export interface DepartmentProjectSummary {
  id: string;
  name: string;
  status: string;
  billable: boolean;
  memberCount: number;
}

export interface DepartmentMemberSummary {
  id: string;
  memberId: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface DepartmentHeadSummary {
  id: string;
  memberId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  assignedAt: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headMemberId: string | null;
  headMemberName: string | null;
  status: DepartmentStatus;
  memberCount: number;
  projectCount: number;
  members: DepartmentMemberSummary[];
  heads: DepartmentHeadSummary[];
  projects: DepartmentProjectSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListResponse {
  items: DepartmentSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DepartmentMetaResponse {
  members: LookupOption[];
  departments: LookupOption[];
}
