/**
 * Default permission templates for common role types.
 * These provide sensible starting points when creating new roles.
 */

import { type RolePermissions } from '@/modules/roles/types/role';
import { HRMS_MODULES, getActionsForModule } from '@/modules/roles/schema/roleSchemas';

/**
 * Creates an empty permissions object with all modules set to "none".
 */
export function createEmptyPermissions(): RolePermissions {
  const permissions: RolePermissions = {};
  
  for (const moduleKey of HRMS_MODULES) {
    const actions = getActionsForModule(moduleKey);
    permissions[moduleKey] = {};
    
    for (const action of actions) {
      permissions[moduleKey][action] = 'none';
    }
  }
  
  return permissions;
}

/**
 * Employee role — can view and manage their own data only.
 */
export function createEmployeePermissions(): RolePermissions {
  const permissions = createEmptyPermissions();
  
  // Time & Attendance
  permissions.attendance.view = 'self';
  permissions.attendance.create = 'self';
  permissions.attendance.edit = 'self';
  
  permissions.leaves.view = 'self';
  permissions.leaves.create = 'self';
  
  permissions.timesheet.view = 'self';
  permissions.timesheet.create = 'self';
  permissions.timesheet.edit = 'self';
  
  permissions.projects.view = 'organization'; // Can see all projects
  
  permissions.weeklyPlan.view = 'self';
  permissions.weeklyPlan.create = 'self';
  permissions.weeklyPlan.edit = 'self';

  permissions.jobs.view = 'self';
  permissions.jobs.create = 'self';
  permissions.jobs.edit = 'self';
  permissions.jobs.delete = 'self';

  permissions.interviews.view = 'self';
  permissions.interviews.create = 'self';
  permissions.interviews.edit = 'self';
  permissions.interviews.delete = 'self';
  permissions.interviews.approve = 'self';

  // Lifecycle
  permissions.documentCollection.view = 'self';
  permissions.documentCollection.create = 'self';
  
  // Payroll
  permissions.payslips.view = 'self'; // Can view own payslips
  
  // Operations
  permissions.assets.view = 'self'; // Can see assigned assets
  permissions.helpdesk.view = 'self';
  permissions.helpdesk.create = 'self';
  
  return permissions;
}

/**
 * Department Lead role - can manage department members.
 */
export function createDepartmentLeadPermissions(): RolePermissions {
  const permissions = createEmployeePermissions();
  
  // Upgrade to department scope for key modules
  permissions.employees.view = 'department';
  
  permissions.attendance.view = 'department';
  permissions.leaves.view = 'department';
  permissions.leaves.approve = 'department';
  
  permissions.timesheet.view = 'department';
  permissions.weeklyPlan.view = 'department';
  
  permissions.performance = {
    view: 'department',
    create: 'department',
    edit: 'department',
    delete: 'none',
  };
  
  return permissions;
}

/**
 * Department Manager role — can manage their department.
 */
export function createDepartmentManagerPermissions(): RolePermissions {
  const permissions = createDepartmentLeadPermissions();
  
  // Upgrade to department scope
  permissions.employees.view = 'department';
  permissions.employees.edit = 'department';
  
  permissions.attendance.view = 'department';
  permissions.leaves.view = 'department';
  permissions.leaves.approve = 'department';
  
  permissions.timesheet.view = 'department';
  permissions.weeklyPlan.view = 'department';
  
  permissions.performance.view = 'department';
  permissions.performance.create = 'department';
  permissions.performance.edit = 'department';
  
  // Recruitment
  permissions.jobs.view = 'department';
  permissions.jobs.create = 'department';
  permissions.candidates.view = 'department';
  permissions.interviews.view = 'department';
  permissions.interviews.create = 'department';
  
  return permissions;
}

/**
 * HR Manager role — full access to people, time, and lifecycle modules.
 */
export function createHRManagerPermissions(): RolePermissions {
  const permissions = createEmptyPermissions();
  
  // People — full access
  permissions.employees.view = 'organization';
  permissions.employees.create = 'organization';
  permissions.employees.edit = 'organization';
  permissions.employees.delete = 'organization';
  
  permissions.organization.view = 'organization';
  permissions.organization.create = 'organization';
  permissions.organization.edit = 'organization';
  permissions.organization.delete = 'organization';
  
  permissions.departments.view = 'organization';
  permissions.departments.create = 'organization';
  permissions.departments.edit = 'organization';
  permissions.departments.delete = 'organization';
  
  permissions.permission.view = 'organization';
  permissions.permission.create = 'organization';
  permissions.permission.edit = 'organization';
  permissions.permission.delete = 'organization';
  
  // Time & Attendance — full access
  permissions.attendance.view = 'organization';
  permissions.attendance.create = 'organization';
  permissions.attendance.edit = 'organization';
  permissions.attendance.delete = 'organization';

  permissions.attendanceReport.view = 'organization';
  permissions.attendanceReport.create = 'organization';
  permissions.attendanceReport.edit = 'organization';
  permissions.attendanceReport.delete = 'organization';
  permissions.attendanceReport.approve = 'organization';
  
  permissions.leaves.view = 'organization';
  permissions.leaves.create = 'self';
  permissions.leaves.edit = 'organization';
  permissions.leaves.delete = 'organization';
  permissions.leaves.approve = 'organization';
  
  permissions.timesheet.view = 'organization';
  permissions.timesheet.create = 'organization';
  permissions.timesheet.edit = 'organization';
  permissions.timesheet.delete = 'organization';
  
  permissions.projects.view = 'organization';
  permissions.projects.create = 'organization';
  permissions.projects.edit = 'organization';
  permissions.projects.delete = 'organization';
  
  permissions.weeklyPlan.view = 'organization';
  permissions.weeklyPlan.create = 'organization';
  permissions.weeklyPlan.edit = 'organization';
  permissions.weeklyPlan.delete = 'organization';
  
  // Recruitment — full access
  permissions.jobs.view = 'organization';
  permissions.jobs.create = 'organization';
  permissions.jobs.edit = 'organization';
  permissions.jobs.delete = 'organization';
  
  permissions.candidates.view = 'organization';
  permissions.candidates.create = 'organization';
  permissions.candidates.edit = 'organization';
  permissions.candidates.delete = 'organization';
  
  permissions.interviews.view = 'organization';
  permissions.interviews.create = 'organization';
  permissions.interviews.edit = 'organization';
  permissions.interviews.delete = 'organization';

  permissions.hiringTeams.view = 'organization';
  permissions.hiringTeams.create = 'organization';
  permissions.hiringTeams.edit = 'organization';
  permissions.hiringTeams.delete = 'organization';
  
  permissions.offers.view = 'organization';
  permissions.offers.create = 'organization';
  permissions.offers.edit = 'organization';
  permissions.offers.delete = 'organization';
  
  // Lifecycle — full access
  permissions.onboarding.view = 'organization';
  permissions.onboarding.create = 'organization';
  permissions.onboarding.edit = 'organization';
  permissions.onboarding.delete = 'organization';
  
  permissions.documentCollection.view = 'organization';
  permissions.documentCollection.create = 'organization';
  permissions.documentCollection.edit = 'organization';
  permissions.documentCollection.delete = 'organization';
  
  permissions.offboarding.view = 'organization';
  permissions.offboarding.create = 'organization';
  permissions.offboarding.edit = 'organization';
  permissions.offboarding.delete = 'organization';
  
  permissions.knowledgeTransfer.view = 'organization';
  permissions.knowledgeTransfer.create = 'organization';
  permissions.knowledgeTransfer.edit = 'organization';
  permissions.knowledgeTransfer.delete = 'organization';
  
  // Payroll — view only (Finance team handles edits)
  permissions.salaryStructures.view = 'organization';
  permissions.payroll.view = 'organization';
  permissions.payslips.view = 'organization';
  permissions.tax.view = 'organization';
  permissions.procurement.view = 'organization';
  permissions.procurement.create = 'organization';
  
  // Operations
  permissions.assets.view = 'organization';
  permissions.assets.create = 'organization';
  permissions.assets.edit = 'organization';
  permissions.assets.delete = 'organization';

  permissions.maintenance.view = 'organization';
  permissions.maintenance.create = 'organization';
  permissions.maintenance.edit = 'organization';
  permissions.maintenance.delete = 'organization';

  permissions.helpdesk.view = 'organization';
  permissions.helpdesk.create = 'organization';
  permissions.helpdesk.edit = 'organization';
  permissions.helpdesk.delete = 'organization';
  
  permissions.documents.view = 'organization';
  permissions.documents.create = 'organization';
  permissions.documents.edit = 'organization';
  permissions.documents.delete = 'organization';
  
  return permissions;
}

/**
 * Finance Manager role — full access to payroll and finance modules.
 */
export function createFinanceManagerPermissions(): RolePermissions {
  const permissions = createEmptyPermissions();
  
  // People — view only
  permissions.employees.view = 'organization';
  permissions.organization.view = 'organization';
  permissions.departments.view = 'organization';
  permissions.permission.view = 'self';
  
  // Time & Attendance — view only (for payroll calculations)
  permissions.attendance.view = 'organization';
  permissions.leaves.view = 'organization';
  permissions.timesheet.view = 'organization';
  
  // Payroll & Finance — full access
  permissions.salaryStructures.view = 'organization';
  permissions.salaryStructures.create = 'organization';
  permissions.salaryStructures.edit = 'organization';
  permissions.salaryStructures.delete = 'organization';
  
  permissions.payroll.view = 'organization';
  permissions.payroll.create = 'organization';
  permissions.payroll.edit = 'organization';
  permissions.payroll.delete = 'organization';
  
  permissions.payslips.view = 'organization';
  permissions.payslips.create = 'organization';
  permissions.payslips.edit = 'organization';
  permissions.payslips.delete = 'organization';
  
  permissions.tax.view = 'organization';
  permissions.tax.create = 'organization';
  permissions.tax.edit = 'organization';
  permissions.tax.delete = 'organization';
  permissions.procurement.view = 'organization';
  permissions.procurement.edit = 'organization';
  permissions.procurement.approve = 'organization';
  
  // Operations
  permissions.documents.view = 'organization';
  
  return permissions;
}

/**
 * Admin role — full access to everything.
 */
export function createAdminPermissions(): RolePermissions {
  const permissions: RolePermissions = {};
  
  for (const moduleKey of HRMS_MODULES) {
    const actions = getActionsForModule(moduleKey);
    permissions[moduleKey] = {};
    
    for (const action of actions) {
      permissions[moduleKey][action] = 'organization';
    }
  }
  
  return permissions;
}

/**
 * Role template definitions.
 */
export interface RoleTemplate {
  name: string;
  description: string;
  permissions: RolePermissions;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Employee',
    description: 'Basic employee with access to their own data',
    permissions: createEmployeePermissions(),
  },
  {
    name: 'Department Lead',
    description: 'Can manage department members and approve department leave requests',
    permissions: createDepartmentLeadPermissions(),
  },
  {
    name: 'Department Manager',
    description: 'Can manage department members and handle recruitment',
    permissions: createDepartmentManagerPermissions(),
  },
  {
    name: 'HR Manager',
    description: 'Full access to people, time, recruitment, and lifecycle',
    permissions: createHRManagerPermissions(),
  },
  {
    name: 'Finance Manager',
    description: 'Full access to payroll and finance modules',
    permissions: createFinanceManagerPermissions(),
  },
  {
    name: 'Admin',
    description: 'Full access to all modules',
    permissions: createAdminPermissions(),
  },
  {
    name: 'Custom',
    description: 'Start from scratch with no permissions',
    permissions: createEmptyPermissions(),
  },
];
