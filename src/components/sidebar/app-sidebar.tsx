"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    DotsHorizontalIcon,
    GearIcon,
    ExitIcon,
    MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
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
import { authClient } from "@/lib/auth-client";
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
    "organization": Building2,
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
        <div className="relative group px-1 mb-1.5">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 dark:text-zinc-500" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search navigation..."
                aria-label="Search navigation"
                className={cn(
                    "h-10 w-full rounded-[12px] pl-10 pr-9 text-[14px] font-[500]",
                    "border border-[var(--color-sidebar-border)] bg-white dark:border-zinc-800/40 dark:bg-zinc-900/40",
                    "text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-zinc-500",
                    "focus:border-indigo-500/30 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/5",
                    "transition-all duration-200",
                )}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                    <span className="text-[14px] leading-none">×</span>
                </button>
            )}
        </div>
    );
}

function RoleBadge({ roleName }: { readonly roleName: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none text-[var(--color-sidebar-text)] dark:border-white/5 dark:bg-white/10 dark:text-white/50">
            {roleName}
        </span>
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
                <nav className="flex flex-col gap-1">
                    {navGroups.map((group) => (
                        <div key={group.title} className="flex flex-col gap-1">
                            <SidebarLabel>{group.title}</SidebarLabel>
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
                                                            ? "text-(--color-sidebar-active-text)"
                                                            : "text-(--color-sidebar-text)",
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
          getScope(permissions, "employees", "edit") === "organization" ||
          getScope(permissions, "organization", "edit") === "organization"
        : false;
    const { open } = useSidebar();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const shouldReduceMotion = useReducedMotion();

    const displayName = user.name ?? user.email ?? "User";
    const initials = getInitials(user.name, user.email);

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
        <div ref={dropdownRef} className="relative border-t border-[var(--color-sidebar-border)] dark:border-zinc-800/80 pt-4 flex items-center justify-between gap-1">
            <button
                onClick={!open ? () => setDropdownOpen((v) => !v) : undefined}
                suppressHydrationWarning
                className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left min-w-0 select-none",
                    !open
                        ? "transition-all duration-200 hover:bg-[var(--color-sidebar-accent)] dark:hover:bg-zinc-900 active:scale-[0.98] cursor-pointer"
                        : "cursor-default"
                )}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
            >
                {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} className="h-10 w-10 shrink-0 rounded-full border border-slate-100 dark:border-zinc-800" alt={displayName} />
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[var(--color-sidebar-border)] dark:bg-zinc-800 text-[13px] font-[700] text-slate-700 dark:text-zinc-300">
                        {initials}
                    </div>
                )}

                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="flex min-w-0 flex-1 flex-col overflow-hidden"
                    aria-hidden={!open}
                >
                    <span className="truncate text-[14px] font-bold text-slate-800 dark:text-zinc-100 leading-tight">
                        {displayName}
                    </span>
                    <span className="truncate text-[12px] font-medium text-slate-400 dark:text-zinc-500 mt-0.5 leading-none">
                        {roleName ?? user.email ?? "Employee"}
                    </span>
                </motion.div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        type="button"
                        onClick={() => setDropdownOpen((v) => !v)}
                        className="p-2 rounded-lg transition-colors text-slate-400 hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-text-hover)] dark:hover:bg-zinc-900 active:scale-95 shrink-0"
                        aria-label="Settings panel"
                    >
                        <GearIcon className="h-5 w-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {dropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        role="menu"
                        className={cn(
                            "absolute bottom-full z-50 mb-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--color-surface)] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#2a2a2c] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
                            open ? "left-0 right-0" : "left-0 w-56",
                        )}
                    >
                        <div className="mb-1 px-3 py-3">
                            <p className="truncate text-[13px] font-semibold text-[var(--color-foreground)]">{displayName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--color-sidebar-text)]">{user.email}</p>
                        </div>

                        <div className="space-y-0.5">
                            <Link
                                href={`/${orgSlug}/settings/account`}
                                role="menuitem"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--color-sidebar-text)] transition-colors hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-text-hover)]"
                            >
                                <GearIcon className="h-4 w-4 shrink-0" />
                                Account Settings
                            </Link>
                            {isAdmin && (
                                <Link
                                    href={`/${orgSlug}/settings`}
                                    role="menuitem"
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--color-sidebar-text)] transition-colors hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-text-hover)]"
                                >
                                    <Building2 className="h-4 w-4 shrink-0" />
                                    Organization Settings
                                </Link>
                            )}
                            <div className="mx-2 my-1 h-px bg-[var(--color-sidebar-border)]" />
                            <button
                                role="menuitem"
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--color-sidebar-text)] transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
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

    void orgName;

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
            <SidebarBody className="justify-between gap-4 border-r border-[var(--color-sidebar-divider)] bg-[var(--color-sidebar-bg)]">
                <div className="flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto no-scrollbar">
                    <OrganizationSwitcher currentOrgSlug={orgSlug} organizations={organizations} />
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
