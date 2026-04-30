"use client";

import * as React from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";

export type OrgSidebarShellProps = {
    readonly children: React.ReactNode;
    readonly orgSlug: string;
    readonly orgName: string;
    readonly user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
};

export function OrgSidebarShell({
    children,
    orgSlug,
    orgName,
    user,
}: OrgSidebarShellProps) {
    return (
        <SidebarProvider>
            <AppSidebar orgSlug={orgSlug} orgName={orgName} user={user} />
            <SidebarInset>
                <div className="flex min-h-svh flex-col">
                    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 lg:px-8">
                        {children}
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
