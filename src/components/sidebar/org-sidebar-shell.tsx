"use client";

import * as React from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { type RolePermissions } from "@/lib/hrms-roles";

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
                <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
