"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { LogOutIcon, SettingsIcon, ChevronsUpDownIcon } from "lucide-react";

export type NavUserProps = {
    readonly orgSlug: string;
    readonly user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
};

function getInitials(name?: string | null, email?: string | null) {
    if (name) {
        const parts = name.split(" ").filter(Boolean);
        const initials = parts.slice(0, 2).map((part) => part[0]);
        return initials.join("").toUpperCase();
    }

    if (email) {
        return email.slice(0, 2).toUpperCase();
    }

    return "US";
}

export function NavUser({ orgSlug, user }: NavUserProps) {
    const { isMobile } = useSidebar();
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true);
            await authClient.signOut();
            router.push("/login");
            router.refresh();
        } finally {
            setIsSigningOut(false);
        }
    };

    const displayName = user.name ?? user.email ?? "User";
    const initials = getInitials(user.name, user.email);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="h-12 justify-start gap-3 px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-md border border-sidebar-border">
                                <AvatarImage
                                    src={user.image ?? undefined}
                                    alt={displayName}
                                />
                                <AvatarFallback className="rounded-md bg-sidebar-accent text-xs font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 min-w-0 text-left leading-tight">
                                <span className="truncate text-sm font-medium text-sidebar-foreground">
                                    {displayName}
                                </span>
                                <span className="truncate text-xs text-sidebar-foreground/55">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage
                                        src={user.image ?? undefined}
                                        alt={displayName}
                                    />
                                    <AvatarFallback className="rounded-lg">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {displayName}
                                    </span>
                                    <span className="truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={`/${orgSlug}/settings`}>
                                <SettingsIcon className="size-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled={isSigningOut}
                            onSelect={(event) => {
                                event.preventDefault();
                                handleSignOut();
                            }}
                        >
                            <LogOutIcon className="size-4" />
                            <span>{isSigningOut ? "Signing out..." : "Log out"}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
