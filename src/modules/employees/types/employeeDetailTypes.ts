export interface EmployeeContactInfo {
  email: string | null;
  user_principal_name: string | null;
  mobile_phone: string | null;
  business_phones: string[];
  office_location: string | null;
}

export interface EmployeeAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface EmployeeEmployment {
  employee_id: string | null;
  job_title: string | null;
  department: string | null;
  company_name: string | null;
  employee_type: string | null;
  hire_date: string | null;
  usage_location: string | null;
  user_type: string | null;
  preferred_language: string | null;
}

export interface EmployeeRoleBrief {
  id: string;
  name: string;
}

export interface EmployeePersonBrief {
  member_id: string | null;
  user_id: string | null;
  name: string;
  email: string | null;
  job_title: string | null;
  department: string | null;
  image: string | null;
  microsoft_id: string | null;
}

export interface EmployeeManagerChainEntry {
  graph_id: string;
  display_name: string;
  user_principal_name?: string | null;
  job_title?: string | null;
  department?: string | null;
  mail?: string | null;
  member_id?: string | null;
}

export interface EmployeeGroupBrief {
  id: string;
  display_name: string;
  description: string | null;
  group_type: string | null;
}

export interface EmployeeSyncInfo {
  microsoft_id: string | null;
  synced_at: string | null;
  created_date_time: string | null;
  account_enabled: boolean;
  status: string;
}

export interface EmployeeAttendanceToday {
  status: 'PRESENT' | 'ABSENT' | 'WORK_FROM_HOME' | 'HALF_DAY' | 'NO_RECORD' | 'HOLIDAY' | string;
  clock_in: string | null;
  clock_out: string | null;
}

export interface EmployeeDetail {
  member_id: string;
  user_id: string | null;
  name: string;
  given_name: string | null;
  surname: string | null;
  image: string | null;
  profile_photo_url: string | null;
  contact: EmployeeContactInfo;
  address: EmployeeAddress | null;
  employment: EmployeeEmployment;
  role: EmployeeRoleBrief | null;
  manager: EmployeePersonBrief | null;
  direct_reports: EmployeePersonBrief[];
  manager_chain: EmployeeManagerChainEntry[];
  groups: EmployeeGroupBrief[];
  sync: EmployeeSyncInfo;
  attendance_today: EmployeeAttendanceToday;
  joined_at: string;
}

export interface EmployeeRefreshResult {
  member_id: string;
  synced_at: string;
  direct_reports_count: number;
  groups_count: number;
  manager_resolved: boolean;
}

export interface EmployeeDirectReportsResponse {
  member_id: string;
  direct_reports: EmployeePersonBrief[];
}

export interface EmployeeGroupListResponse {
  member_id: string;
  groups: EmployeeGroupBrief[];
}

export interface EmployeeManagerChainResponse {
  member_id: string;
  manager_chain: EmployeeManagerChainEntry[];
}

export interface UpdateEmployeeDetailsInput {
  display_name?: string | null;
  given_name?: string | null;
  surname?: string | null;
  job_title?: string | null;
  department_name?: string | null;
  mobile_phone?: string | null;
  office_location?: string | null;
  employee_type?: string | null;
  employee_hire_date?: string | null;
  usage_location?: string | null;
  company_name?: string | null;
  employee_id?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface UpdateEmployeeDetailsResponse {
  member_id: string;
  name: string;
  employment: EmployeeEmployment;
  contact: EmployeeContactInfo;
  synced_at: string | null;
}
