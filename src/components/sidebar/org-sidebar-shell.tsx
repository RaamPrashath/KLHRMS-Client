"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import type { SidebarOrganizationOption } from "@/components/sidebar/organization-switcher";
import { type RolePermissions } from "@/lib/hrms-roles";
import { cn } from "@/lib/utils";

export interface OrgSidebarShellProps {
    readonly children: React.ReactNode;
    readonly orgSlug: string;
    readonly orgName: string;
    readonly roleName: string | null;
    readonly permissions: RolePermissions | null;
    readonly organizations: SidebarOrganizationOption[];
    readonly user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function OrgSidebarShell({
    children,
    orgSlug,
    orgName,
    roleName,
    permissions,
    organizations,
    user,
}: OrgSidebarShellProps) {
    const pathname = usePathname();
    const cleanPath = pathname.replace(/\/$/, "");
    const isDashboardRoute = cleanPath === `/${orgSlug}` || cleanPath.endsWith(`/${orgSlug}`);

    const isLeaveRoute = pathname.includes("/leaves");
    const isCandidatesRoute = pathname.includes("/candidates");
    const isTimesheetRoute = pathname.includes("/timesheet");
    const isAttendanceRoute = pathname.includes("/attendance");
    const isDepartmentsRoute = pathname.includes("/departments");
    const isEmployeesRoute = pathname.includes("/employees");
    const isProjectsRoute = pathname.includes("/projects");
    const isJobsRoute = pathname.includes("/jobs");
    const isInterviewsRoute = pathname.includes("/interviews");
    const isWeeklyPlanRoute = pathname.includes("/weekly-plan");
    const isAssetRoute = pathname.includes("/assets")
    const isMaintenanceRoute = pathname.includes("/maintenance")
    const isPermissionsRoute = pathname.includes("/permissions")
    const isStageRoute = pathname.includes("/stage");
    const isHelpdeskRoute = pathname.includes("/helpdesk");
    const isDRoute = pathname.includes("/")
    
    const isFullWidthRoute = 
        isLeaveRoute || 
        isCandidatesRoute || 
        isTimesheetRoute || 
        isEmployeesRoute || 
        isDepartmentsRoute || 
        isAttendanceRoute || 
        isProjectsRoute || 
        isJobsRoute || 
        isInterviewsRoute || 
        isWeeklyPlanRoute ||
        isAssetRoute || 
        isMaintenanceRoute || 
        isPermissionsRoute ||
        isStageRoute ||
        isHelpdeskRoute || isDRoute

    return (
        <div className="fixed inset-0 flex overflow-hidden bg-canvas">
            <AppSidebar
                orgSlug={orgSlug}
                orgName={orgName}
                roleName={roleName}
                permissions={permissions}
                organizations={organizations}
                user={user}
            />
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div
                    className={cn(
                        "w-full",
                        isFullWidthRoute ? "min-h-full" : "mx-auto max-w-6xl px-6 py-8 lg:px-8",
                        isLeaveRoute || isDRoute || isPermissionsRoute || isAssetRoute || isMaintenanceRoute || isCandidatesRoute || isTimesheetRoute || isEmployeesRoute || isDepartmentsRoute || isAttendanceRoute || isProjectsRoute || isJobsRoute || isInterviewsRoute || isWeeklyPlanRoute || isDashboardRoute || isHelpdeskRoute ? "min-h-full flex flex-col" : "mx-auto max-w-6xl px-6 py-8 lg:px-8",
                        
                    )}
                >
                    {children}
                </div>
            </main>
        </div>
    );
}
