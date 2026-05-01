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
        .replaceAll("&", "and")
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");
}

function buildNav(orgSlug: string): NavGroup[] {
    const groups = [
        {
            title: "People",
            icon: <UsersIcon />,
            items: ["Employees", "Organization", "Departments", "Permissions"],
        },
        {
            title: "Time & Attendance",
            icon: <ClockIcon />,
            items: ["Attendance", "Leaves", "Timesheet", "Projects", "Weekly Plan"],
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

export function AppSidebar({
    orgSlug,
    orgName,
    user,
    ...props
}: AppSidebarProps) {
    const navItems = React.useMemo(() => buildNav(orgSlug), [orgSlug]);

    return (
        <Sidebar collapsible="none" className="border-r border-sidebar-border" {...props}>
            <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <span className="text-sm font-bold">{orgName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="truncate text-sm font-semibold text-sidebar-foreground">
                            {orgName}
                        </p>
                        {/* 12px minimum — was 10px */}
                        <p className="text-xs text-sidebar-foreground/50">HR Management</p>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent className="bg-sidebar px-3 py-4">
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-3 py-3">
                <NavUser orgSlug={orgSlug} user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}
