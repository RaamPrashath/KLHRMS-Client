/**
 * HRMS Permission System
 * Navigation and access control is driven entirely by the `permissions` JSON
 * stored in the `role` table — not by a role name enum.
 *
 * Permission JSON shape (example):
 * {
 *   "attendance": { "view": "org", "edit": "self", "create": "self", "delete": "none" },
 *   "leaves":     { "view": "self", "approve": "org" },
 *   "weeklyPlan": { "view": "org", "edit": "self" },
 *   "permission": { "view": "self" }
 * }
 *
 * A nav item is visible when the user has ANY non-"none" action on the
 * corresponding permission key.
 */

// ─── Permission types ─────────────────────────────────────────────────────────

export type PermissionScope = "none" | "self" | "organization" | "team" | "department";

export type ModulePermissions = Record<string, PermissionScope>;

export type RolePermissions = Record<string, ModulePermissions>;

// ─── Nav config ───────────────────────────────────────────────────────────────
// Each nav item declares which permission key gates its visibility.
// If permissionKey is undefined the item is always shown (e.g. a home page).

export interface HrmsNavItem {
    title: string;
    urlSuffix: string;
    /** Key in the permissions JSON that gates this item. */
    permissionKey?: string;
}

export interface HrmsNavGroup {
    title: string;
    items: HrmsNavItem[];
}

export const HRMS_NAV_CONFIG: HrmsNavGroup[] = [
    {
        title: "General",
        items: [
            { title: "Dashboard", urlSuffix: "" }, // base /{orgSlug} route — always visible
        ],
    },
    {
        title: "People",
        items: [
            { title: "Employees",          urlSuffix: "employees",           permissionKey: "employees"   },
            { title: "Organization",       urlSuffix: "organization",        permissionKey: "organization" },
            { title: "Departments",        urlSuffix: "departments",         permissionKey: "departments" },
            { title: "Permissions",        urlSuffix: "permissions",         permissionKey: "permission"  },
        ],
    },
    {
        title: "Time & Attendance",
        items: [
            { title: "Attendance",         urlSuffix: "attendance",          permissionKey: "attendance"  },
            { title: "Leaves",             urlSuffix: "leaves",              permissionKey: "leaves"      },
            { title: "Timesheet",          urlSuffix: "timesheet",           permissionKey: "timesheet"   },
            { title: "Projects",           urlSuffix: "projects",            permissionKey: "projects"    },
            { title: "Plan",               urlSuffix: "weekly-plan",         permissionKey: "weeklyPlan"  },
        ],
    },
    {
        title: "Recruitment",
        items: [
            { title: "Jobs",               urlSuffix: "jobs",                permissionKey: "jobs"        },
            { title: "Candidates",         urlSuffix: "candidates",          permissionKey: "candidates"  },
            { title: "Interviews",         urlSuffix: "interviews",          permissionKey: "interviews"  },
            { title: "Offers",             urlSuffix: "offers",              permissionKey: "offers"      },
        ],
    },
    {
        title: "Lifecycle",
        items: [
            { title: "Onboarding",         urlSuffix: "onboarding",          permissionKey: "onboarding"         },
            { title: "Document Collection",urlSuffix: "document-collection", permissionKey: "documentCollection" },
            { title: "Offboarding",        urlSuffix: "offboarding",         permissionKey: "offboarding"        },
            { title: "Knowledge Transfer", urlSuffix: "knowledge-transfer",  permissionKey: "knowledgeTransfer"  },
        ],
    },
    {
        title: "Payroll & Finance",
        items: [
            { title: "Salary Structures",  urlSuffix: "salary-structures",   permissionKey: "salaryStructures" },
            { title: "Payroll",            urlSuffix: "payroll",             permissionKey: "payroll"          },
            { title: "Payslips",           urlSuffix: "payslips",            permissionKey: "payslips"         },
            { title: "Tax",                urlSuffix: "tax",                 permissionKey: "tax"              },
        ],
    },
    {
        title: "Operations",
        items: [
            { title: "Assets",             urlSuffix: "assets",              permissionKey: "assets"    },
            { title: "Helpdesk",           urlSuffix: "helpdesk",            permissionKey: "helpdesk"  },
            { title: "Documents",          urlSuffix: "documents",           permissionKey: "documents" },
        ],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has at least one non-"none" action on the given
 * permission key.
 */
export function hasPermission(
    permissions: RolePermissions | null | undefined,
    key: string,
): boolean {
    if (!permissions) return false;
    const modulePermissions = permissions[key];
    if (!modulePermissions) return false;
    return Object.values(modulePermissions).some((scope) => scope !== "none");
}

/**
 * Returns the scope for a specific action on a module, or "none" if absent.
 */
export function getScope(
    permissions: RolePermissions | null | undefined,
    key: string,
    action: string,
): PermissionScope {
    if (!permissions) return "none";
    return (permissions[key]?.[action] as PermissionScope) ?? "none";
}

/**
 * Filters the nav config to items the user has access to based on their
 * permissions JSON. Groups with no visible items are dropped.
 */
export function filterNavByPermissions(
    permissions: RolePermissions | null | undefined,
): HrmsNavGroup[] {
    if (!permissions) return [];

    return HRMS_NAV_CONFIG.reduce<HrmsNavGroup[]>((acc, group) => {
        const visibleItems = group.items.filter((item) => {
            if (!item.permissionKey) return true; // always visible
            return hasPermission(permissions, item.permissionKey);
        });
        if (visibleItems.length > 0) {
            acc.push({ ...group, items: visibleItems });
        }
        return acc;
    }, []);
}
