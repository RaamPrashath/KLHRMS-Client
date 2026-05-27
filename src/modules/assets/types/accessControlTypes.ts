export interface AccessControlLogItem {
  id: string;
  employeeMemberId: string;
  assetId: string | null;
  accessPoint: string;
  entryMethod: string;
  status: string;
  direction: string;
  enteredAt: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  employeeName: string | null;
  employeeEmail: string | null;
  assetName: string | null;
  assetCode: string | null;
}

export interface AccessControlLogListResponse {
  items: AccessControlLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccessControlLogSummary {
  totalEntriesToday: number;
  grantedToday: number;
  deniedToday: number;
  activeAssignments: number;
  uniqueEmployeesToday: number;
}

export interface AccessControlAssignmentItem {
  id: string;
  employeeMemberId: string;
  accessPoint: string;
  status: string;
  grantedByMemberId: string | null;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName: string | null;
  employeeEmail: string | null;
  grantedByName: string | null;
}

export interface AccessControlAssignmentListResponse {
  items: AccessControlAssignmentItem[];
  total: number;
  page: number;
  pageSize: number;
}
