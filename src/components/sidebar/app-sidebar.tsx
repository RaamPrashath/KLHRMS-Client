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
    "weekly-plan": CalendarDays,
    "projects": FolderKanban,
    "timesheet": ClipboardList,
    "leaves": CalendarOff,
    "jobs": Briefcase,
    "candidates": UserSearch,
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
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95"
            >
                <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
        );
    }

    return (
        <div className="relative group px-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40 group-focus-within:text-white" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search"
                aria-label="Search navigation"
                className={cn(
                    "h-9 w-full rounded-lg pl-9 pr-8 text-[13px]",
                    "border border-white/5 bg-white/5",
                    "text-white placeholder:text-white/30",
                    "focus:border-white/10 focus:bg-white/10 focus:outline-none",
                    "transition-all duration-200",
                )}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white"
                >
                    <span className="text-[14px] leading-none">x</span>
                </button>
            )}
        </div>
    );
}

function RoleBadge({ roleName }: { readonly roleName: string }) {
    return (
        <span className="inline-flex items-center rounded-full border border-white/5 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none text-white/50">
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
            {showSearch && <NavSearch value={search} onChange={setSearch} />}

            {navGroups.length === 0 ? (
                <div className="px-2 pb-4 text-center text-xs leading-relaxed text-[var(--color-sidebar-label)]">
                    {search.trim() ? (
                        <>No results for &quot;{search}&quot;</>
                    ) : (
                        <>No role assigned.<br />Contact your admin.</>
                    )}
                </div>
            ) : (
                <nav className="flex flex-col">
                    {navGroups.map((group) => (
                        <div key={group.title} className="flex flex-col gap-0.5">
                            <SidebarLabel>{group.title}</SidebarLabel>
                            {group.items.map((item) => {
                                const url = item.urlSuffix ? `/${orgSlug}/${item.urlSuffix}` : `/${orgSlug}`;
                                const isActive = pathname === url;
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
}: {
    user: AppSidebarProps["user"];
    orgSlug: string;
    roleName: string | null;
}) {
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
        <div ref={dropdownRef} className="relative border-t border-white/5 pt-4">
            <button
                onClick={() => setDropdownOpen((v) => !v)}
                suppressHydrationWarning
                className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/5 active:scale-[0.98]",
                    dropdownOpen && "bg-white/5 shadow-inner",
                )}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
            >
                {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} className="h-8 w-8 shrink-0 rounded-full border border-white/10" alt={displayName} />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/10 text-[11px] font-bold text-white/90">
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
                    <span className="truncate text-[13.5px] font-medium capitalize leading-tight text-white">
                        {displayName}
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        {roleName ? (
                            <RoleBadge roleName={roleName} />
                        ) : (
                            user.email && (
                                <span className="truncate text-[11px] leading-tight text-white/40">
                                    {user.email}
                                </span>
                            )
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="shrink-0 overflow-hidden"
                    aria-hidden={!open}
                >
                    <DotsHorizontalIcon className="h-4 w-4 text-white/30" />
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
                            "absolute bottom-full z-50 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#2a2a2c] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
                            open ? "left-0 right-0" : "left-0 w-56",
                        )}
                    >
                        <div className="mb-1 px-3 py-3">
                            <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                            <p className="mt-0.5 truncate text-[11px] text-white/40">{user.email}</p>
                        </div>

                        <div className="space-y-0.5">
                            <Link
                                href={`/${orgSlug}/settings`}
                                role="menuitem"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <GearIcon className="h-4 w-4 shrink-0" />
                                Settings
                            </Link>
                            <div className="mx-2 my-1 h-px bg-white/5" />
                            <button
                                role="menuitem"
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/70 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
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

                <UserFooter user={user} orgSlug={orgSlug} roleName={roleName} />
            </SidebarBody>
        </Sidebar>
    );
}
