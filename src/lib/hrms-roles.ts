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
 * corresponding permission key. If minAction is set, the user must have
 * that specific action at a non-"none" scope.
 */

// ─── Permission types ─────────────────────────────────────────────────────────

export type PermissionScope = "none" | "self" | "organization" | "department";

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
    /** If set, the user needs this specific action at a non-"none" scope to see the item. */
    minAction?: string;
    /** If set, the user's scope for minAction must exactly match this value. */
    minScope?: PermissionScope;
}

export interface HrmsNavGroup {
    title: string;
    items: HrmsNavItem[];
}

export const HRMS_NAV_CONFIG: HrmsNavGroup[] = [
    {
        title: "Main",
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
            { title: "Projects",           urlSuffix: "projects",            permissionKey: "projects"    },
        ],
    },
    {
        title: "Time & Attendance",
        items: [
            { title: "Attendance",         urlSuffix: "attendance",          permissionKey: "attendance"  },
            { title: "Report",             urlSuffix: "attendance-report",   permissionKey: "attendanceReport", minAction: "view" },
            { title: "Plan",               urlSuffix: "weekly-plan",         permissionKey: "weeklyPlan"  },
            { title: "Timesheet",          urlSuffix: "timesheet",           permissionKey: "timesheet"   },
            { title: "Leaves",             urlSuffix: "leaves",              permissionKey: "leaves"      },
        ],
    },
    {
        title: "Recruitment",
        items: [
            { title: "Jobs",               urlSuffix: "jobs",                permissionKey: "jobs"        },
            { title: "Candidates",         urlSuffix: "candidates",          permissionKey: "candidates"  },
            { title: "Recruitment Report", urlSuffix: "recruitment-report",  permissionKey: "jobs", minAction: "view", minScope: "organization" },
            { title: "Resume Parser",      urlSuffix: "resume-parser",       permissionKey: "jobs", minAction: "view" },
            { title: "Interviews",         urlSuffix: "interviews",          permissionKey: "interviews"  },
        ],
    },
    {
        title: "Payroll & Finance",
        items: [
            { title: "Salary Structures",  urlSuffix: "salary-structures",   permissionKey: "salaryStructures" },
            { title: "Payroll",            urlSuffix: "payroll",             permissionKey: "payroll"          },
            { title: "Payslips",           urlSuffix: "payslips",            permissionKey: "payslips"         },
            { title: "Tax",                urlSuffix: "tax",                 permissionKey: "tax"              },
            { title: "Procurement",        urlSuffix: "procurement",         permissionKey: "procurement"      },
        ],
    },
    {
        title: "Operations",
        items: [
            { title: "Assets",             urlSuffix: "assets",              permissionKey: "assets"    },
            { title: "Asset Maintenance",  urlSuffix: "asset-maintenance",   permissionKey: "maintenance" },
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
            if (!item.permissionKey) return true;
            if (!hasPermission(permissions, item.permissionKey)) return false;
            if (item.minAction && item.permissionKey) {
                const scope = getScope(permissions, item.permissionKey, item.minAction);
                if (scope === "none") return false;
                if (item.minScope && scope !== item.minScope) return false;
            }
            return true;
        });
        if (visibleItems.length > 0) {
            acc.push({ ...group, items: visibleItems });
        }
        return acc;
    }, []);
}
