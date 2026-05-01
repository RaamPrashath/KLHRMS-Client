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
        // h-dvh + overflow-hidden locks the entire shell to the viewport.
        // Nothing outside this box can cause the page to scroll.
        <SidebarProvider className="h-dvh overflow-hidden">
            <AppSidebar orgSlug={orgSlug} orgName={orgName} user={user} />
            {/*
             * SidebarInset is the right-hand flex child.
             * min-h-0 is critical: without it, a flex child ignores overflow
             * and grows past its parent, causing the page to scroll.
             * overflow-y-auto makes only this panel scroll.
             */}
            <SidebarInset className="min-h-0 overflow-y-auto">
                <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
