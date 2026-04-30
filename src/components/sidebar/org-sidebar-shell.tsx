"use client";

import * as React from "react";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";

export type OrgSidebarShellProps = {
    children: React.ReactNode;
    orgSlug: string;
    orgName: string;
    user: {
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
                    <div className="flex h-12 items-center gap-2 border-b border-border/60 px-4 md:hidden">
                        <SidebarTrigger />
                        <span className="text-sm font-medium">{orgName}</span>
                    </div>
                    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 lg:px-8">
                        {children}
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
