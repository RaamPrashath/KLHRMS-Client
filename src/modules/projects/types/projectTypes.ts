export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export interface ProjectCapacitySummary {
  budgetedHours: number | null;
  allocatedHours: number;
  loggedHours: number | null;
  remainingHours: number | null;
  warning: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
  clientName: string | null;
  budget: number | null;
  budgetedHours: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  billable: boolean;
  memberCount: number;
  taskCount: number;
  allocatedHours: number;
  capacity: ProjectCapacitySummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberSummary {
  id: string;
  memberId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  allocatedHours: number | null;
}

export interface ProjectTaskSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectTaskStatus;
  assignedMemberId: string | null;
  assignedMemberName: string | null;
  createdAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  members: ProjectMemberSummary[];
  tasks: ProjectTaskSummary[];
}

export interface ProjectListResponse {
  items: ProjectSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProjectLookupOption {
  id: string;
  label: string;
  email?: string | null;
}

export interface ProjectMetaResponse {
  members: ProjectLookupOption[];
  departments: ProjectLookupOption[];
  teams: ProjectLookupOption[];
}

export interface ProjectFiltersState {
  search?: string;
  status?: ProjectStatus;
  billable?: boolean;
  page: number;
  pageSize: number;
}
