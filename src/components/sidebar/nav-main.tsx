"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

export type NavMainItem = {
    title: string;
    icon?: React.ReactNode;
    items: {
        title: string;
        url: string;
    }[];
};

export function NavMain({ items }: { readonly items: NavMainItem[] }) {
    const pathname = usePathname();

    return (
        <SidebarGroup className="space-y-5">
            {items.map((group) => {
                return (
                    <div key={group.title} className="space-y-0.5">
                        {/* Group label: 12px minimum, full opacity, readable contrast */}
                        <SidebarGroupLabel className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                            {group.icon && (
                                <span className="[&>svg]:size-3 text-sidebar-foreground/40">
                                    {group.icon}
                                </span>
                            )}
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarMenu className="gap-px">
                            {group.items.map((item) => {
                                const isActive = pathname === item.url;

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            className="h-9 justify-start px-3 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                                        >
                                            <Link href={item.url}>
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </div>
                );
            })}
        </SidebarGroup>
    );
}
