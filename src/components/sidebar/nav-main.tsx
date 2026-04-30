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
                            defaultOpen={isGroupActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={isGroupActive}
                                        className="text-[var(--color-sidebar-text)] hover:bg-white/5 hover:text-[var(--color-sidebar-text-hover)] data-active:bg-[var(--color-sidebar-active-bg)] data-active:text-[var(--color-sidebar-active-text)] data-active:border-l-[3px] data-active:border-l-[var(--color-sidebar-active-border)]"
                                    >
                                        {item.icon}
                                        <span>{item.title}</span>
                                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="border-[var(--color-sidebar-divider)]">
                                        {item.items.map((subItem) => {
                                            const isActive = pathname === subItem.url;

                                            return (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={isActive}
                                                        className="text-[13px] text-[var(--color-sidebar-label)] hover:text-[var(--color-sidebar-text-hover)] data-active:bg-transparent data-active:text-[var(--color-sidebar-active-text)] data-active:font-medium"
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
