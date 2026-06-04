# Roles & Permissions Module

This module implements the KL HRMS permission system, which controls access to all HRMS features through a flexible, JSON-based permission model.

## Architecture Overview

The permission system is built on three core concepts:

1. **Modules** — Feature areas (e.g., `attendance`, `leaves`, `payroll`)
2. **Actions** — Operations within a module (e.g., `view`, `create`, `edit`, `delete`)
3. **Scopes** — Access breadth (e.g., `none`, `self`, `department`, `organization`)

## Permission JSON Structure

Permissions are stored as JSON in the `Role.permissions` field:

```json
{
  "attendance": {
    "view": "organization",
    "create": "self",
    "edit": "self",
    "delete": "none"
  },
  "leaves": {
    "view": "department",
    "create": "self",
    "approve": "organization"
  }
}
```

## Scope Hierarchy

Scopes form an ordered hierarchy from most restrictive to least:

```
none < self < department < organization
```

| Scope | Access Level |
|-------|-------------|
| `none` | No access — action is completely blocked |
| `self` | Only the member's own records |
| `department` | Records belonging to members in the same department |
| `organization` | All records across the entire organization |

## Standard Actions

Most modules support these four standard actions:

- `view` — Read/list records
- `create` — Create new records
- `edit` — Update existing records
- `delete` — Remove/deactivate records

## Domain-Specific Actions

Some modules define additional actions beyond the standard set:

| Module | Extra Action | Meaning |
|--------|-------------|---------|
| `leaves` | `approve` | Approve or reject leave requests |

To add a new domain-specific action:

1. Add it to `MODULE_SPECIFIC_ACTIONS` in `schema/roleSchemas.ts`
2. Document it in this README
3. Implement the backend permission check using `require_permission(module, action)`

## HRMS Modules

All available modules are defined in `schema/roleSchemas.ts`:

### People
- `employees` — Employee profiles & directory
- `organization` — Org chart & structure
- `departments` — Department management
- `permission` — Role & permission management

### Time & Attendance
- `attendance` — Clock-in/out & attendance records
- `leaves` — Leave requests & balances
- `timesheet` — Timesheet entries
- `projects` — Project tracking
- `weeklyPlan` — Weekly planning

### Recruitment
- `jobs` — Job requisitions
- `candidates` — ATS & candidate pipeline
- `interviews` — Interview scheduling
- `offers` — Offer letters

### Lifecycle
- `onboarding` — Onboarding checklists
- `documentCollection` — Document collection workflows
- `offboarding` — Offboarding tasks
- `knowledgeTransfer` — Knowledge transfer records

### Payroll & Finance
- `salaryStructures` — Salary structure definitions
- `payroll` — Payroll runs
- `payslips` — Payslip generation & access
- `tax` — Tax compliance

### Operations
- `assets` — Asset management
- `helpdesk` — Internal helpdesk tickets
- `documents` — Company document library

## Frontend Components

### RolePermissionsGrid

The main UI for editing permissions. Displays a matrix of modules × actions with clickable scope badges that cycle through the hierarchy.

**Features:**
- Click any badge to cycle: `none -> self -> department -> organization -> none`
- Visual color coding for each scope level
- Separate section for domain-specific actions
- Keyboard accessible (Enter/Space to activate)

**Usage:**

```tsx
import { RolePermissionsGrid } from '@/modules/roles/components/RolePermissionsGrid';

<RolePermissionsGrid
  value={permissions}
  onChange={setPermissions}
  disabled={isSubmitting}
/>
```

### RoleForm

Form for creating/editing roles. Includes name input and embedded `RolePermissionsGrid`.

### RolesPageShell

Complete page shell with:
- Search/filter
- Role cards grid
- Create/edit slide-over
- Delete confirmation dialog

## Frontend Utilities

### Navigation Filtering

The sidebar is dynamically filtered based on the current member's permissions:

```typescript
import { filterNavByPermissions } from '@/lib/hrms-roles';

const visibleNav = filterNavByPermissions(currentMember.role.permissions);
```

A nav item is visible when the user has **any** non-`"none"` action on that module.

### Permission Checks

```typescript
import { hasPermission, getScope } from '@/lib/hrms-roles';

// Check if user has ANY access to a module
if (hasPermission(permissions, 'attendance')) {
  // Show attendance nav item
}

// Get specific scope for an action
const scope = getScope(permissions, 'attendance', 'view');
if (scope === 'organization') {
  // User can view all attendance records
}
```

## Backend Integration

### Request Flow

Every data operation follows this chain:

```
Client Page (RSC)
    ↓
TanStack Query hook
    ↓
Next.js Server Action
    ↓
FastAPI backend
    ↓
Controller → Service → Repository
```

### Required Headers

Server Actions must include these headers when calling FastAPI:

```typescript
{
  'x-organization-slug': orgSlug,
  'x-membership-id': memberId,
}
```

### Permission Enforcement

Backend routes use the `require_permission` dependency:

```python
from app.shared.deps.permissions import require_permission

@router.get("/roles")
async def list_roles(
    ctx: Annotated[MemberContext, Depends(require_permission("permission", "view", allow_self=True))],
    db: AsyncSession = Depends(get_db),
):
    return await handle_list_roles(ctx, db)
```

**Parameters:**
- `module` — The HRMS module key (e.g., `"permission"`)
- `action` — The action being performed (e.g., `"view"`)
- `allow_self` — Whether to accept `"self"` scope in addition to `"organization"`

### Self-Filtering

When `allow_self=True`, the controller must apply self-filtering:

```python
async def handle_list_roles(ctx: MemberContext, db: AsyncSession):
    scope = getattr(ctx, "scope", "organization")
    
    if scope == "self":
        # Return only the member's own role
        if ctx.member.role is None:
            return []
        return [RoleResponse.model_validate(ctx.member.role)]
    
    # Return all roles in the organization
    roles = await list_roles(db, ctx.organization.id)
    return [RoleResponse.model_validate(r) for r in roles]
```

## Adding a New Module

To add a new HRMS module with permissions:

### 1. Register the Module

Add the module key to `HRMS_MODULES` in `client/src/modules/roles/schema/roleSchemas.ts`:

```typescript
export const HRMS_MODULES = [
  // ... existing modules
  'myNewModule',
] as const;
```

### 2. Add to Navigation

Add the nav item to `HRMS_NAV_CONFIG` in `client/src/lib/hrms-roles.ts`:

```typescript
{
  title: "My Feature",
  items: [
    { 
      title: "My Module", 
      urlSuffix: "my-module", 
      permissionKey: "myNewModule" 
    },
  ],
}
```

### 3. Implement Backend Permission Checks

Use `require_permission` in your FastAPI routes:

```python
@router.get("/my-module")
async def list_items(
    ctx: Annotated[MemberContext, Depends(require_permission("myNewModule", "view", allow_self=True))],
    db: AsyncSession = Depends(get_db),
):
    # Implementation
    pass
```

### 4. Document It

Add the module to the table in this README and in `.agents/steering/instruction.md`.

## Testing Permissions

### Frontend Testing

Test permission helpers:

```typescript
import { hasPermission, getScope } from '@/lib/hrms-roles';

const permissions = {
  attendance: { view: 'organization', create: 'self' }
};

expect(hasPermission(permissions, 'attendance')).toBe(true);
expect(hasPermission(permissions, 'payroll')).toBe(false);
expect(getScope(permissions, 'attendance', 'view')).toBe('organization');
expect(getScope(permissions, 'attendance', 'delete')).toBe('none');
```

### Backend Testing

Test permission resolution:

```python
from app.shared.utils.permissions import get_permission_scope

permissions = {
    "attendance": {
        "view": "organization",
        "create": "self"
    }
}

assert get_permission_scope(permissions, "attendance", "view") == "organization"
assert get_permission_scope(permissions, "attendance", "create") == "self"
assert get_permission_scope(permissions, "attendance", "delete") is None
assert get_permission_scope(permissions, "payroll", "view") is None
```

## Security Considerations

### Critical Rules

1. **Never use role names for permission checks** — Always read from the `permissions` JSON
2. **Every query must be scoped by `organizationId`** — Multi-tenant isolation is mandatory
3. **Missing permissions default to `"none"`** — Fail closed, not open
4. **Backend is the source of truth** — Frontend checks are for UX only; backend enforces access

### Common Pitfalls

❌ **Wrong — checking role name:**
```typescript
if (member.role.name === 'Admin') {
  // This is wrong! Role names are display labels only
}
```

✅ **Right — checking permissions JSON:**
```typescript
if (hasPermission(member.role.permissions, 'attendance')) {
  // Correct — reads from the permissions JSON
}
```

❌ **Wrong — missing organizationId filter:**
```python
# CRITICAL SECURITY VULNERABILITY
result = await db.execute(
    select(Role).where(Role.id == role_id)
)
```

✅ **Right — always scope by organization:**
```python
result = await db.execute(
    select(Role).where(
        Role.id == role_id,
        Role.organizationId == organization_id
    )
)
```

## File Structure

```
client/src/modules/roles/
├── api/
│   └── roleServerActions.ts       # Server Actions for CRUD
├── components/
│   ├── RolePermissionsGrid.tsx    # Permission matrix editor
│   ├── RoleForm.tsx               # Create/edit form
│   ├── RoleCard.tsx               # Role display card
│   ├── RolesGrid.tsx              # Grid of role cards
│   ├── RolesPageShell.tsx         # Complete page shell
│   ├── RolesSlideOver.tsx         # Create/edit slide-over
│   ├── RolesSearchInput.tsx       # Search/filter input
│   └── DeleteRoleDialog.tsx       # Delete confirmation
├── hooks/
│   ├── useRolesQuery.ts           # Fetch roles
│   ├── useCreateRole.ts           # Create mutation
│   ├── useUpdateRole.ts           # Update mutation
│   └── useDeleteRole.ts           # Delete mutation
├── schema/
│   └── roleSchemas.ts             # Zod schemas & constants
├── types/
│   └── role.ts                    # TypeScript types
└── README.md                      # This file
```

## Related Documentation

- **Backend Permission System:** `server/app/shared/deps/permissions.py`
- **Permission Utilities:** `server/app/shared/utils/permissions.py`
- **Full System Documentation:** `.agents/steering/instruction.md`
- **Navigation Config:** `client/src/lib/hrms-roles.ts`
