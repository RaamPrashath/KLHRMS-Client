import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

export const HRMS_MODULES = [
  'employees',
  'leaves',
  'attendance',
  'payroll',
  'recruitment',
  'performance',
  'documents',
  'permissions',
] as const;

export const HRMS_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

// 5 states: none → self → team → department → organization → none
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
