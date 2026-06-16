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
    /** Secondary group titles where this item should also appear if visible.
     *  Items only inject into groups that already have at least one visible item. */
    alsoShowInGroup?: string[];
    /** Position overrides for alsoShowInGroup targets. Key is group title, value is the index to insert at. */
    alsoShowInGroupPositions?: Record<string, number>;
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
            { title: "Jobs",               urlSuffix: "jobs",                permissionKey: "jobs", minAction: "view", minScope: "organization" },
            { title: "Candidates",         urlSuffix: "candidates",          permissionKey: "candidates"  },
            { title: "Recruitment Report", urlSuffix: "recruitment-report",  permissionKey: "jobs", minAction: "view", minScope: "organization" },
            { title: "Resume Parser",      urlSuffix: "resume-parser",       permissionKey: "jobs", minAction: "view", minScope: "organization" },
            { title: "Interviews",         urlSuffix: "interviews",          permissionKey: "interviews" },
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
            { title: "Asset Maintenance",  urlSuffix: "asset-maintenance",   permissionKey: "maintenance" },
            { title: "Procurement",        urlSuffix: "procurement",         permissionKey: "procurement" },
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

function isItemVisible(
    item: HrmsNavItem,
    permissions: RolePermissions,
): boolean {
    if (!item.permissionKey) return true;
    if (!hasPermission(permissions, item.permissionKey)) return false;
    if (item.minAction && item.permissionKey) {
        const scope = getScope(permissions, item.permissionKey, item.minAction);
        if (scope === "none") return false;
        if (item.minScope && scope !== item.minScope) return false;
    }
    return true;
}

/**
 * Filters the nav config to items the user has access to based on their
 * permissions JSON.
 *
 * - Items remain under their original group headings — no scope-based
 *   extraction to a separate group.
 * - Items with `alsoShowInGroup` are injected into matching secondary groups
 *   (only if the target group already has at least one visible item).
 * - Groups with no visible items are dropped.
 */
export function filterNavByPermissions(
    permissions: RolePermissions | null | undefined,
): HrmsNavGroup[] {
    if (!permissions) return [];

    // ── First pass: determine visibility for every item across all groups ──
    const allVisibleItems: { item: HrmsNavItem; groupTitle: string }[] = [];

    for (const group of HRMS_NAV_CONFIG) {
        for (const item of group.items) {
            if (isItemVisible(item, permissions)) {
                allVisibleItems.push({ item, groupTitle: group.title });
            }
        }
    }

    // ── Build groups from all visible items by their original group ──
    const groupMap = new Map<string, HrmsNavItem[]>();

    for (const entry of allVisibleItems) {
        const list = groupMap.get(entry.groupTitle);
        if (list) {
            list.push(entry.item);
        } else {
            groupMap.set(entry.groupTitle, [entry.item]);
        }
    }

    // ── Inject alsoShowInGroup items into secondary groups ──
    for (const entry of allVisibleItems) {
        const secondaryGroups = entry.item.alsoShowInGroup ?? [];
        for (const targetGroup of secondaryGroups) {
            if (groupMap.has(targetGroup) && groupMap.get(targetGroup)!.length > 0) {
                const existing = groupMap.get(targetGroup)!;
                if (!existing.some((i) => i.urlSuffix === entry.item.urlSuffix)) {
                    const pos = entry.item.alsoShowInGroupPositions?.[targetGroup];
                    if (pos !== undefined) {
                        existing.splice(pos, 0, entry.item);
                    } else {
                        existing.push(entry.item);
                    }
                }
            }
        }
    }

    // ── Build final result, preserving HRMS_NAV_CONFIG group order ──
    const result: HrmsNavGroup[] = [];

    for (const group of HRMS_NAV_CONFIG) {
        const items = groupMap.get(group.title);
        if (items && items.length > 0) {
            result.push({ title: group.title, items });
        }
    }

    return result;
}
