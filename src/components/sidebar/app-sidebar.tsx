"use client";

import * as React from "react";
import {
    BriefcaseIcon,
    ClockIcon,
    FolderIcon,
    LifeBuoyIcon,
    ReceiptTextIcon,
    ShieldCheckIcon,
    TargetIcon,
    UsersIcon,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

export type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    orgSlug: string;
    orgName: string;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
};

type NavGroup = {
    title: string;
    icon: React.ReactNode;
    items: {
        title: string;
        url: string;
    }[];
};

function slugify(value: string) {
    return value
        .toLowerCase()
        .replaceAll("&", "and")
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");
}

// Custom URL overrides for items whose slugified name doesn't match the route
const URL_OVERRIDES: Record<string, string> = {
    'roles-and-permissions': 'roles',
};

function buildNav(orgSlug: string): NavGroup[] {
    const groups = [
        {
            title: "People",
            icon: <UsersIcon />,
            items: ["Employees", "Organization", "Departments"],
        },
        {
            title: "Access Control",
            icon: <ShieldCheckIcon />,
            items: ["Roles & Permissions"],
        },
        {
            title: "Time & Attendance",
            icon: <ClockIcon />,
            items: ["Attendance", "Leaves", "Timesheet", "Projects"],
        },
        {
            title: "Recruitment",
            icon: <BriefcaseIcon />,
            items: ["Jobs", "Candidates", "Interviews", "Offers"],
        },
        {
            title: "Lifecycle",
            icon: <LifeBuoyIcon />,
            items: [
                "Onboarding",
                "Document Collection",
                "Offboarding",
                "Knowledge Transfer",
            ],
        },
        {
            title: "Performance",
            icon: <TargetIcon />,
            items: ["OKRs", "Goals", "Reviews", "Feedback"],
        },
        {
            title: "Payroll & Finance",
            icon: <ReceiptTextIcon />,
            items: ["Salary Structures", "Payroll", "Payslips", "Tax"],
        },
        {
            title: "Operations",
            icon: <FolderIcon />,
            items: ["Assets", "Helpdesk", "Documents"],
        },
    ];

    return groups.map((group) => ({
        ...group,
        items: group.items.map((item) => {
            const slug = slugify(item);
            const resolvedSlug = URL_OVERRIDES[slug] ?? slug;
            return {
                title: item,
                url: `/${orgSlug}/${resolvedSlug}`,
            };
        }),
    }));
}

export function AppSidebar({
    orgSlug,
    orgName,
    user,
    ...props
}: AppSidebarProps) {
    const navItems = React.useMemo(() => buildNav(orgSlug), [orgSlug]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b border-(--color-sidebar-divider) pb-3">
                <div className="px-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-(--color-sidebar-label)">
                        Organization
                    </p>
                    <p className="mt-1 text-sm font-semibold text-(--color-sidebar-text-hover)">
                        {orgName}
                    </p>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser orgSlug={orgSlug} user={user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
