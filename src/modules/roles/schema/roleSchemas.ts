import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * All HRMS modules that can have permissions assigned.
 * These keys must match the permissionKey values in HRMS_NAV_CONFIG.
 */
export const HRMS_MODULES = [
  // People
  'employees',
  'organization',
  'departments',
  'permission',
  // Time & Attendance
  'attendance',
  'leaves',
  'timesheet',
  'projects',
  'weeklyPlan',
  // Recruitment
  'jobs',
  'candidates',
  'interviews',
  'offers',
  // Lifecycle
  'onboarding',
  'documentCollection',
  'offboarding',
  'knowledgeTransfer',
  // Payroll & Finance
  'salaryStructures',
  'payroll',
  'payslips',
  'tax',
  // Operations
  'assets',
  'helpdesk',
  'documents',
] as const;

/**
 * Standard actions available for most modules.
 * Domain-specific actions (e.g., leaves.approve) are handled separately.
 */
export const HRMS_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

/**
 * Domain-specific actions per module.
 * These extend the standard actions for specific modules.
 */
export const MODULE_SPECIFIC_ACTIONS: Record<string, readonly string[]> = {
  leaves: ['approve'],
} as const;

/**
 * Scope hierarchy: none → self → team → department → organization → none (cycles)
 * Each scope defines how broadly an action applies.
 */
export const SCOPE_CYCLE = [
  'none',
  'self',
  'team',
  'department',
  'organization',
] as const;

// ─── Derived Types ────────────────────────────────────────────────────────────

export type ScopeValue = (typeof SCOPE_CYCLE)[number];
export type HrmsModule = (typeof HRMS_MODULES)[number];
export type HrmsAction = (typeof HRMS_ACTIONS)[number];

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns all actions available for a given module.
 * Combines standard actions with module-specific actions.
 */
export function getActionsForModule(module: string): readonly string[] {
  const standardActions = [...HRMS_ACTIONS];
  const specificActions = MODULE_SPECIFIC_ACTIONS[module] || [];
  return [...standardActions, ...specificActions];
}

/**
 * Advances a scope value to the next in the cycle.
 * Wraps from 'organization' back to 'none'.
 */
export function nextScope(current: ScopeValue): ScopeValue {
  const idx = SCOPE_CYCLE.indexOf(current);
  return SCOPE_CYCLE[(idx + 1) % SCOPE_CYCLE.length];
}

/**
 * Returns true if at least one action in the permissions map has a non-'none' scope.
 */
function hasAtLeastOneNonNoneScope(
  permissions: Record<string, Record<string, string>>,
): boolean {
  return Object.values(permissions).some((actions) =>
    Object.values(actions).some((scope) => scope !== 'none'),
  );
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

// Zod v4: use explicit key type z.string() in z.record() to get correct inference
const permissionsSchema = z.record(z.string(), z.record(z.string(), z.string()));

export const roleCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(255, 'Role name must be 255 characters or fewer'),
  permissions: permissionsSchema.refine(hasAtLeastOneNonNoneScope, {
    message: 'At least one permission must be set to a non-none scope',
  }),
});

export const roleUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Role name is required')
      .max(255, 'Role name must be 255 characters or fewer')
      .optional(),
    permissions: permissionsSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.permissions !== undefined,
    { message: 'At least one field must be provided for update' },
  );

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type RoleFormValues = z.infer<typeof roleCreateSchema>;
export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
