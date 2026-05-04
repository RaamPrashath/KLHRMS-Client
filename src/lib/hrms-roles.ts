/**
 * HRMS Role & Permission System
 * Single source of truth for role definitions and nav access matrix.
 * Derived from .kiro/steering/role_permission.md
 *
 * NOTE: The enum is defined here directly (not imported from generated/prisma)
 * because the generated folder lives outside src/ and is not reachable via @/*.
 * The string values match the Prisma schema enum exactly.
 */

// ─── HrmsRole enum ───────────────────────────────────────────
// Must stay in sync with the HrmsRole enum in prisma/schema.prisma

export const HrmsRole = {
    SUPER_ADMIN: "SUPER_ADMIN",
    HR:          "HR",
    ADMIN:       "ADMIN",
    MANAGER:     "MANAGER",
    EMPLOYEE:    "EMPLOYEE",
} as const;

export type HrmsRole = (typeof HrmsRole)[keyof typeof HrmsRole];

// ─── Nav Access Matrix ────────────────────────────────────────────────────────
// Each nav item declares which roles can see it.
// SUPER_ADMIN always sees everything — enforced in filterNavByRole, not here.

export interface HrmsNavItem {
    title: string;
    urlSuffix: string; // appended to /{orgSlug}/
    roles: HrmsRole[]; // roles that can see this item (SUPER_ADMIN implicit)
}

export interface HrmsNavGroup {
    title: string;
    items: HrmsNavItem[];
}

export const HRMS_NAV_CONFIG: HrmsNavGroup[] = [
    {
        title: "People",
        items: [
            {
                title: "Employees",
                urlSuffix: "employees",
                roles: ["SUPER_ADMIN", "HR", "ADMIN"],
            },
            {
                title: "Organization",
                urlSuffix: "organization",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Departments",
                urlSuffix: "departments",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Permissions",
                urlSuffix: "permissions",
                roles: ["SUPER_ADMIN"],
            },
        ],
    },
    {
        title: "Time & Attendance",
        items: [
            {
                title: "Attendance",
                urlSuffix: "attendance",
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"],
            },
            {
                title: "Leaves",
                urlSuffix: "leaves",
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"],
            },
            {
                title: "Timesheet",
                urlSuffix: "timesheet",
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"],
            },
            {
                title: "Projects",
                urlSuffix: "projects",
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER"],
            },
            {
                title: "Weekly Plan",
                urlSuffix: "weekly-plan",
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER"],
            },
        ],
    },
    {
        title: "Recruitment",
        items: [
            {
                title: "Jobs",
                urlSuffix: "jobs",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Candidates",
                urlSuffix: "candidates",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Interviews",
                urlSuffix: "interviews",
                // MANAGER can give feedback — they see this item
                roles: ["SUPER_ADMIN", "HR", "MANAGER"],
            },
            {
                title: "Offers",
                urlSuffix: "offers",
                roles: ["SUPER_ADMIN", "HR"],
            },
        ],
    },
    {
        title: "Lifecycle",
        items: [
            {
                title: "Onboarding",
                urlSuffix: "onboarding",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Document Collection",
                urlSuffix: "document-collection",
                roles: ["SUPER_ADMIN", "HR", "ADMIN"],
            },
            {
                title: "Offboarding",
                urlSuffix: "offboarding",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Knowledge Transfer",
                urlSuffix: "knowledge-transfer",
                roles: ["SUPER_ADMIN", "HR"],
            },
        ],
    },
    {
        title: "Payroll & Finance",
        items: [
            {
                title: "Salary Structures",
                urlSuffix: "salary-structures",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Payroll",
                urlSuffix: "payroll",
                roles: ["SUPER_ADMIN", "HR"],
            },
            {
                title: "Payslips",
                urlSuffix: "payslips",
                // ADMIN read-only, EMPLOYEE own — both see the page, access scoped server-side
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "EMPLOYEE"],
            },
            {
                title: "Tax",
                urlSuffix: "tax",
                roles: ["SUPER_ADMIN", "HR"],
            },
        ],
    },
    {
        title: "Operations",
        items: [
            {
                title: "Assets",
                urlSuffix: "assets",
                roles: ["SUPER_ADMIN", "HR", "ADMIN"],
            },
            {
                title: "Helpdesk",
                urlSuffix: "helpdesk",
                // Everyone can submit/view helpdesk tickets
                roles: ["SUPER_ADMIN", "HR", "ADMIN", "MANAGER", "EMPLOYEE"],
            },
            {
                title: "Documents",
                urlSuffix: "documents",
                roles: ["SUPER_ADMIN", "HR", "ADMIN"],
            },
        ],
    },
];

// ─── Filter helper ────────────────────────────────────────────────────────────

/**
 * Returns nav groups filtered to what `role` is allowed to see.
 * SUPER_ADMIN bypasses all checks and sees every item.
 * Groups with no visible items are dropped entirely.
 * If role is null (not yet assigned), returns empty — no nav shown.
 */
export function filterNavByRole(
    role: HrmsRole | null | undefined,
): HrmsNavGroup[] {
    if (!role) return [];

    // SUPER_ADMIN sees everything
    if (role === "SUPER_ADMIN") return HRMS_NAV_CONFIG;

    return HRMS_NAV_CONFIG.reduce<HrmsNavGroup[]>((acc, group) => {
        const visibleItems = group.items.filter((item) =>
            item.roles.includes(role),
        );
        if (visibleItems.length > 0) {
            acc.push({ ...group, items: visibleItems });
        }
        return acc;
    }, []);
}

// ─── Role display helpers ─────────────────────────────────────────────────────

export const HRMS_ROLE_LABELS: Record<HrmsRole, string> = {
    SUPER_ADMIN: "Super Admin",
    HR: "HR",
    ADMIN: "Admin",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
};

export const HRMS_ROLE_BADGE_COLORS: Record<HrmsRole, string> = {
    SUPER_ADMIN: "bg-[rgba(234,67,53,0.12)] text-[#ea4335]",
    HR:          "bg-[rgba(0,135,74,0.12)]  text-[#00874a]",
    ADMIN:       "bg-[rgba(66,133,244,0.12)] text-[#4285f4]",
    MANAGER:     "bg-[rgba(251,188,5,0.12)]  text-[#a07000]",
    EMPLOYEE:    "bg-[rgba(174,174,178,0.12)] text-[#6e6e73]",
};
