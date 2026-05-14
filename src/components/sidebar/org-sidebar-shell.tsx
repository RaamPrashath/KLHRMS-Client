"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { type RolePermissions } from "@/lib/hrms-roles";
import { cn } from "@/lib/utils";

export interface OrgSidebarShellProps {
    readonly children: React.ReactNode;
    readonly orgSlug: string;
    readonly orgName: string;
    readonly roleName: string | null;
    readonly permissions: RolePermissions | null;
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
    user,
}: OrgSidebarShellProps) {
    const pathname = usePathname();
    const isLeaveRoute = pathname.includes("/leaves");
    const isCandidatesRoute = pathname.includes("/candidates");
    const isFullWidthRoute = isLeaveRoute || isCandidatesRoute || pathname.includes("/assets");

    return (
        <div className="flex h-dvh overflow-hidden">
            <AppSidebar
                orgSlug={orgSlug}
                orgName={orgName}
                roleName={roleName}
                permissions={permissions}
                user={user}
            />
            <main className="flex-1 min-h-0 overflow-y-auto">
                <div
                    className={cn(
                        "w-full",
                        isFullWidthRoute ? "min-h-full" : "mx-auto max-w-6xl px-6 py-8 lg:px-8",
                    )}
                >
                    {children}
                </div>
            </main>
        </div>
    );
}
