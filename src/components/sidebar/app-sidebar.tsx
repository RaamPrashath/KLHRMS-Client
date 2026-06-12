"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    GearIcon,
    ExitIcon,
    MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    LayoutDashboard,
    Users,
    Building2,
    Network,
    ShieldCheck,
    CalendarClock,
    CalendarOff,
    ClipboardList,
    FolderKanban,
    CalendarDays,
    Briefcase,
    UserSearch,
    Calendar,
    FileText,
    UserPlus,
    FolderOpen,
    UserMinus,
    BookOpen,
    Target,
    Flag,
    Star,
    MessageCircle,
    Layers,
    Banknote,
    Receipt,
    Calculator,
    ShoppingCart,
    Monitor,
    Wrench,
    Headphones,
    FileStack,
} from "lucide-react";
import {
    Sidebar,
    SidebarBody,
    SidebarLink,
    SidebarLabel,
    useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { getHrmsApiUrl } from "@/lib/deployment-env";
import { cn } from "@/lib/utils";
import {
    type RolePermissions,
    filterNavByPermissions,
    getScope,
} from "@/lib/hrms-roles";
import { OrganizationSwitcher, type SidebarOrganizationOption } from "@/components/sidebar/organization-switcher";

export interface AppSidebarProps {
    orgSlug: string;
    orgName: string;
    roleName: string | null;
    permissions: RolePermissions | null;
    organizations: SidebarOrganizationOption[];
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

const ic = "h-4 w-4 shrink-0";

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    "": LayoutDashboard,
    "employees": Users,
    "departments": Network,
    "permissions": ShieldCheck,
    "attendance": CalendarClock,
    "attendance-report": FileText,
    "weekly-plan": CalendarDays,
    "projects": FolderKanban,
    "timesheet": ClipboardList,
    "leaves": CalendarOff,
    "jobs": Briefcase,
    "candidates": UserSearch,
    "resume-parser": FileText,
    "interviews": Calendar,
    "offers": FileText,
    "onboarding": UserPlus,
    "document-collection": FolderOpen,
    "offboarding": UserMinus,
    "knowledge-transfer": BookOpen,
    "okrs": Target,
    "goals": Flag,
    "reviews": Star,
    "feedback": MessageCircle,
    "salary-structures": Layers,
    "payroll": Banknote,
    "payslips": Receipt,
    "tax": Calculator,
    "procurement": ShoppingCart,
    "assets": Monitor,
    "asset-maintenance": Wrench,
    "maintenance": Wrench,
    "helpdesk": Headphones,
    "documents": FileStack,
};

function getInitials(name?: string | null, email?: string | null) {
    if (name) {
        const parts = name.split(" ").filter(Boolean);
        return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "US";
}

function toAbsoluteApiUrl(url?: string | null): string | null {
    if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
        return url ?? null;
    }
    return `${getHrmsApiUrl().replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function NavSearch({
    value,
    onChange,
}: {
    readonly value: string;
    readonly onChange: (v: string) => void;
}) {
    const { open, setOpen } = useSidebar();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 240);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [setOpen]);

    function handleCollapsedClick() {
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 240);
    }

    if (!open) {
        return (
            <button
                onClick={handleCollapsedClick}
                aria-label="Search navigation"
                suppressHydrationWarning
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-sidebar-text)] transition-all duration-200 hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-text-hover)] active:scale-95"
            >
                <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
        );
    }

    return (
        <div className="relative group px-1 mb-2">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 dark:text-zinc-500" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search"
                aria-label="Search navigation"
                className={cn(
                    "h-9 w-full rounded-xl pl-10 pr-10 text-[13px] font-medium",
                    "border-none bg-slate-100/70 hover:bg-slate-100/90 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80",
                    "text-slate-800 placeholder:text-slate-400 dark:text-zinc-200 dark:placeholder:text-zinc-500",
                    "focus:bg-slate-100 dark:focus:bg-zinc-900 focus:outline-none",
                    "transition-all duration-200",
                )}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                    <span className="text-[13px] leading-none">×</span>
                </button>
            )}
        </div>
    );
}

function SidebarNavigation({
    allNavGroups,
    orgSlug,
    pathname,
    showSearch,
}: {
    readonly allNavGroups: ReturnType<typeof filterNavByPermissions>;
    readonly orgSlug: string;
    readonly pathname: string;
    readonly showSearch: boolean;
}) {
    const [search, setSearch] = useState("");

    const navGroups = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return allNavGroups;

        return allNavGroups.reduce<typeof allNavGroups>((acc, group) => {
            const items = group.items.filter((item) =>
                item.title.toLowerCase().includes(term)
            );
            if (items.length > 0) acc.push({ ...group, items });
            return acc;
        }, []);
    }, [allNavGroups, search]);

    return (
        <>
            {showSearch && (
                <NavSearch value={search} onChange={setSearch} />
            )}

            {navGroups.length === 0 ? (
                <div className="px-2 pb-4 text-center text-xs leading-relaxed text-[var(--color-sidebar-label)]">
                    {search.trim() ? (
                        <>No results for &quot;{search}&quot;</>
                    ) : (
                        <>No role assigned.<br />Contact your admin.</>
                    )}
                </div>
            ) : (
                <nav className="flex flex-col gap-0.5">
                    {navGroups.map((group, idx) => (
                        <div key={group.title} className={cn("flex flex-col gap-0.5", idx > 0 && "mt-1.5")}>
                            {group.title.toLowerCase() !== "main" && (
                                <SidebarLabel>{group.title}</SidebarLabel>
                            )}
                            {group.items.map((item) => {
                                const url = item.urlSuffix ? `/${orgSlug}/${item.urlSuffix}` : `/${orgSlug}`;
                                const isActive = url === `/${orgSlug}`
                                    ? pathname === url
                                    : (pathname === url || pathname.startsWith(url + "/"));
                                const Icon = NAV_ICONS[item.urlSuffix as keyof typeof NAV_ICONS];

                                return (
                                    <SidebarLink
                                        key={item.title}
                                        isActive={isActive}
                                        link={{
                                            label: item.title,
                                            href: url,
                                            icon: Icon ? (
                                                <Icon
                                                    className={cn(
                                                        ic,
                                                        isActive
                                                            ? "text-indigo-600 dark:text-indigo-400"
                                                            : "text-slate-400 group-hover/sidebar:text-slate-600 dark:text-zinc-500 dark:group-hover/sidebar:text-zinc-300",
                                                    )}
                                                />
                                            ) : null,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </nav>
            )}
        </>
    );
}

function UserFooter({
    user,
    orgSlug,
    roleName,
    permissions,
}: {
    user: AppSidebarProps["user"];
    orgSlug: string;
    roleName: string | null;
    permissions: RolePermissions | null;
}) {
    const isAdmin = permissions
        ? getScope(permissions, "permission", "edit") === "organization" ||
          getScope(permissions, "employees", "edit") === "organization"
        : false;
    const { open, setOpen } = useSidebar();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const shouldReduceMotion = useReducedMotion();

    const displayName = user.name ?? user.email ?? "User";
    const initials = getInitials(user.name, user.email);
    const imageUrl = toAbsoluteApiUrl(user.image);

    const labelTransition = shouldReduceMotion
        ? { duration: 0 }
        : open
          ? {
                opacity: { duration: 0.14, delay: 0.1, ease: "easeOut" as const },
                width: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
            }
          : {
                opacity: { duration: 0.1, ease: "easeIn" as const },
                width: { duration: 0.22, delay: 0.06, ease: [0.4, 0, 0.2, 1] as const },
            };

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownOpen]);

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true);
            setDropdownOpen(false);
            await authClient.signOut();
            router.push("/login");
            router.refresh();
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <div ref={dropdownRef} className="relative w-full border-t-0 mt-auto">
            <button
                onClick={() => setDropdownOpen((v) => !v)}
                suppressHydrationWarning
                className={cn(
                    "flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left min-w-0 select-none transition-all duration-200 cursor-pointer",
                    "bg-indigo-50/50 hover:bg-indigo-50/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40",
                    dropdownOpen && "bg-indigo-100/70 dark:bg-indigo-950/50"
                )}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
            >
                <Avatar className="h-8 w-8 shrink-0 border border-slate-100 dark:border-zinc-800">
                    <AvatarImage src={imageUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-white text-[11px] font-[700] text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="flex min-w-0 flex-1 flex-col overflow-hidden"
                    aria-hidden={!open}
                >
                    <span className="truncate text-[13.5px] font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                        {displayName}
                    </span>
                    <span className="truncate text-[11.5px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 leading-none">
                        {roleName}
                    </span>
                </motion.div>
            </button>

            <AnimatePresence>
                {dropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        role="menu"
                        className={cn(
                            "absolute bottom-full z-50 mb-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
                            open ? "left-0 right-0" : "left-0 w-56",
                        )}
                    >
                        <div className="mb-1 px-3 py-2.5">
                            <p className="truncate text-[13px] font-semibold text-slate-850 dark:text-white">{displayName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-zinc-400">{user.email}</p>
                        </div>

                        <div className="space-y-0.5">
                            <Link
                                href={`/${orgSlug}/settings/account`}
                                role="menuitem"
                                onClick={() => {
                                    setDropdownOpen(false);
                                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                                        setOpen(false);
                                    }
                                }}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-650 dark:text-zinc-350 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                                <GearIcon className="h-4 w-4 shrink-0" />
                                Account Settings
                            </Link>
                            <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-zinc-800" />
                            <button
                                role="menuitem"
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-650 dark:text-zinc-350 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            >
                                <ExitIcon className="h-4 w-4 shrink-0" />
                                {isSigningOut ? "Signing out..." : "Log out"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function AppSidebar({ orgSlug, orgName, roleName, permissions, organizations, user }: AppSidebarProps) {
    const [open, setOpen] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleResize = () => {
                if (window.innerWidth < 768) {
                    setOpen(false);
                } else {
                    setOpen(true);
                }
            };
            handleResize();
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setOpen(false);
        }
    }, [pathname]);

    void orgName;

    const isAdmin = permissions
        ? getScope(permissions, "permission", "edit") === "organization" ||
          getScope(permissions, "employees", "edit") === "organization"
        : false;

    const allNavGroups = useMemo(
        () => filterNavByPermissions(permissions),
        [permissions],
    );

    const totalNavItems = useMemo(
        () => allNavGroups.reduce((sum, group) => sum + group.items.length, 0),
        [allNavGroups],
    );
    const showSearch = totalNavItems > 6;

    return (
        <Sidebar open={open} setOpen={setOpen} animate={true}>
            <SidebarBody className="justify-between gap-4 border-r-0 bg-white dark:bg-zinc-950 px-3 py-4 pt-3 md:py-4 md:pt-3">
                <div className="flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex items-center pr-14 md:pr-0">
                        <OrganizationSwitcher currentOrgSlug={orgSlug} organizations={organizations} />
                        {open && isAdmin && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={`/${orgSlug}/settings`}
                                        onClick={() => {
                                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                                                setOpen(false);
                                            }
                                        }}
                                        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                        aria-label="Organization Settings"
                                    >
                                        <GearIcon className="h-4 w-4" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    Organization Settings
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <SidebarNavigation
                        key={showSearch ? "with-search" : "without-search"}
                        allNavGroups={allNavGroups}
                        orgSlug={orgSlug}
                        pathname={pathname}
                        showSearch={showSearch}
                    />
                </div>

                <UserFooter user={user} orgSlug={orgSlug} roleName={roleName} permissions={permissions} />
            </SidebarBody>
        </Sidebar>
    );
}
