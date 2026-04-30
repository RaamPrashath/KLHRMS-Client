"use client";

import * as React from "react";
import {
    BriefcaseIcon,
    ClockIcon,
    FolderIcon,
    LifeBuoyIcon,
    ReceiptTextIcon,
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
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function buildNav(orgSlug: string): NavGroup[] {
    const groups = [
        {
            title: "People",
            icon: <UsersIcon />,
            items: ["Employees", "Organization"],
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
        items: group.items.map((item) => ({
            title: item,
            url: `/${orgSlug}/${slugify(item)}`,
        })),
    }));
}

export function AppSidebar({ orgSlug, orgName, user, ...props }: AppSidebarProps) {
    const navItems = React.useMemo(() => buildNav(orgSlug), [orgSlug]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b border-[var(--color-sidebar-divider)] pb-3">
                <div className="px-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--color-sidebar-label)]">
                        Organization
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-sidebar-text-hover)]">
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
