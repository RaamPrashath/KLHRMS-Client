"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRightIcon } from "lucide-react";

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
        <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--color-sidebar-label)]">
                Navigation
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isGroupActive = item.items.some(
                        (subItem) => pathname === subItem.url
                    );

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={isGroupActive}
                                        className="text-[var(--color-sidebar-text-hover)] hover:bg-white/5 data-active:bg-transparent data-active:text-[var(--color-sidebar-text-hover)]"
                                    >
                                        {item.icon}
                                        <span className="text-[var(--color-sidebar-text-hover)] group-data-[active=true]/menu-button:text-[var(--color-sidebar-active-text)]">
                                            {item.title}
                                        </span>
                                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-[collapsible-down_180ms_ease-out] data-[state=closed]:animate-[collapsible-up_180ms_ease-in]">
                                    <SidebarMenuSub className="border-(--color-sidebar-divider)">
                                        {item.items.map((subItem) => {
                                            const isActive = pathname === subItem.url;

                                            return (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isActive}
                                                        className="text-[13px] text-(--color-sidebar-text-hover) hover:text-(--color-sidebar-text-hover) data-active:bg-transparent data-active:text-[var(--color-sidebar-active-text)] data-active:font-medium"
                                                    >
                                                        <Link href={subItem.url}>
                                                            <span>{subItem.title}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
