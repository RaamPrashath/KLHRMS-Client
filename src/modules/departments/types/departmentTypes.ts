export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';
export type TeamStatus = 'ACTIVE' | 'INACTIVE';

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

export interface TeamMemberSummary {
  id: string;
  memberId: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface TeamSummary {
  id: string;
  departmentId: string;
  name: string;
  description: string | null;
  leadMemberId: string | null;
  leadMemberName: string | null;
  status: TeamStatus;
  memberCount: number;
  projectCount: number;
  members: TeamMemberSummary[];
  projects: DepartmentProjectSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headMemberId: string | null;
  headMemberName: string | null;
  status: DepartmentStatus;
  teamCount: number;
  memberCount: number;
  projectCount: number;
  teams: TeamSummary[];
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
