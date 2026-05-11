"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarBody,
    SidebarLink,
    SidebarLabel,
    useSidebar,
} from "@/components/ui/sidebar";
import { useReducedMotion } from "motion/react";
import {
    ChevronLeftIcon,
    DotsHorizontalIcon,
    GearIcon,
    ExitIcon,
    MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
    // General
    LayoutDashboard,
    // People
    Users,
    Building2,
    Network,
    ShieldCheck,
    // Time & Attendance
    CalendarClock,
    CalendarOff,
    ClipboardList,
    FolderKanban,
    CalendarDays,
    // Recruitment
    Briefcase,
    UserSearch,
    Calendar,
    FileText,
    // Lifecycle
    UserPlus,
    FolderOpen,
    UserMinus,
    BookOpen,
    // Performance
    Target,
    Flag,
    Star,
    MessageCircle,
    // Payroll & Finance
    Layers,
    Banknote,
    Receipt,
    Calculator,
    // Operations
    Monitor,
    Headphones,
    FileStack,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import {
    type RolePermissions,
    filterNavByPermissions,
} from "@/lib/hrms-roles";

// ─── Types ───────────────────────────────────────────────────
export interface AppSidebarProps {
    orgSlug: string;
    orgName: string;
    roleName: string | null;
    permissions: RolePermissions | null;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

// ─── Icon map ─────────────────────────────────────────────────
// Maps urlSuffix → Lucide icon component
const ic = "h-4 w-4 shrink-0";

const NAV_ICONS: Record<string, React.ReactElement<{ className?: string }>> = {
    "":                    <LayoutDashboard className={ic} />,
    "employees":           <Users         className={ic} />,
    "organization":        <Building2     className={ic} />,
    "departments":         <Network       className={ic} />,
    "permissions":         <ShieldCheck   className={ic} />,
    "attendance":          <CalendarClock className={ic} />,
    "leaves":              <CalendarOff   className={ic} />,
    "timesheet":           <ClipboardList className={ic} />,
    "projects":            <FolderKanban  className={ic} />,
    "weekly-plan":         <CalendarDays  className={ic} />,
    "jobs":                <Briefcase     className={ic} />,
    "candidates":          <UserSearch    className={ic} />,
    "interviews":          <Calendar      className={ic} />,
    "offers":              <FileText      className={ic} />,
    "onboarding":          <UserPlus      className={ic} />,
    "document-collection": <FolderOpen    className={ic} />,
    "offboarding":         <UserMinus     className={ic} />,
    "knowledge-transfer":  <BookOpen      className={ic} />,
    "okrs":                <Target        className={ic} />,
    "goals":               <Flag          className={ic} />,
    "reviews":             <Star          className={ic} />,
    "feedback":            <MessageCircle className={ic} />,
    "salary-structures":   <Layers        className={ic} />,
    "payroll":             <Banknote      className={ic} />,
    "payslips":            <Receipt       className={ic} />,
    "tax":                 <Calculator    className={ic} />,
    "assets":              <Monitor       className={ic} />,
    "helpdesk":            <Headphones    className={ic} />,
    "documents":           <FileStack     className={ic} />,
};

function getInitials(name?: string | null, email?: string | null) {
    if (name) {
        const parts = name.split(" ").filter(Boolean);
        return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "US";
}

// ─── Logo + Toggle Row ───────────────────────────────────────
function LogoRow({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
    const { open, setOpen, animate } = useSidebar();
    const shouldReduceMotion = useReducedMotion();
    void orgName;
    void orgSlug;

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

    const toggleBtn = animate ? (
        <motion.button
            onClick={() => setOpen(!open)}
            whileTap={{ scale: 0.88 }}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-all duration-200 text-white/40 hover:text-white hover:bg-white/10 active:scale-95"
        >
            <motion.span
                initial={false}
                animate={{ rotate: open ? 0 : 180 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="flex items-center justify-center"
            >
                <ChevronLeftIcon className="h-4 w-4" />
            </motion.span>
        </motion.button>
    ) : null;

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between min-w-0 px-1">
                <div className="flex items-center min-w-0">
                    
                    <motion.div
                        initial={false}
                        animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                        transition={labelTransition}
                        className="overflow-hidden flex flex-col min-w-0 ml-3"
                        aria-hidden={!open}
                    >
                        {/* Full wordmark — white-filtered for dark sidebar */}
                        <p className="text-lg font-semibold tracking-[-0.04em] text-white">
                            Kovan Labs
                        </p>
                    </motion.div>
                </div>

                {open && toggleBtn}
            </div>

            {!open && (
                <div className="flex justify-center">
                    {toggleBtn}
                </div>
            )}
        </div>
    );
}

// ─── Nav Search ───────────────────────────────────────────────
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
        // focus after the open animation settles
        setTimeout(() => inputRef.current?.focus(), 240);
    }

    if (!open) {
        return (
            <button
                onClick={handleCollapsedClick}
                aria-label="Search navigation"
                className="flex items-center justify-center h-9 w-9 rounded-full mx-auto text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
            >
                <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
        );
    }

    return (

        
        <div className="relative group px-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 group-focus-within:text-white transition-colors pointer-events-none" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search"
                aria-label="Search navigation"
                className={cn(
                    "w-full h-9 rounded-full pl-9 pr-8 text-[13px]",
                    "bg-white/5 border border-white/5",
                    "text-white placeholder:text-white/30",
                    "focus:outline-none focus:border-white/10 focus:bg-white/10",
                    "transition-all duration-200",
                )}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                    <span className="text-[14px] leading-none">×</span>
                </button>
            )}
        </div>
    );
}


function RoleBadge({ roleName }: { readonly roleName: string }) {
    return (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none bg-white/10 text-white/50 border border-white/5">
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
    allNavGroups: ReturnType<typeof filterNavByPermissions>;
    orgSlug: string;
    pathname: string;
    showSearch: boolean;
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
                <div className="px-2 py-4 text-xs text-[var(--color-sidebar-label)] text-center leading-relaxed">
                    {search.trim() ? (
                        <>No results for &ldquo;{search}&rdquo;</>
                    ) : (
                        <>No role assigned.<br />Contact your admin.</>
                    )}
                </div>
            ) : (
                <nav className="flex flex-col gap-3.5 mt-1">
                    {navGroups.map((group) => (
                        <div key={group.title} className="flex flex-col gap-0.5">
                            <SidebarLabel>{group.title}</SidebarLabel>
                            {group.items.map((item) => {
                                const url = item.urlSuffix
                                    ? `/${orgSlug}/${item.urlSuffix}`
                                    : `/${orgSlug}`;
                                const isActive = pathname === url;
                                const Icon = NAV_ICONS[item.urlSuffix as keyof typeof NAV_ICONS];

                                return (
                                    <SidebarLink
                                        key={item.title}
                                        isActive={isActive}
                                        link={{
                                            label: item.title,
                                            href: url,
                                            icon: Icon
                                                ? (
                                                    <Icon
                                                        className={cn(
                                                            ic,
                                                            isActive
                                                                ? "text-[var(--color-sidebar-active-text)]"
                                                                : "text-[var(--color-sidebar-text)]"
                                                        )}
                                                    />
                                                )
                                                : null,
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

// ─── User Dropdown Footer ─────────────────────────────────────
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
                className={cn(
                    "flex items-center w-full rounded-xl px-3 py-2.5 transition-all duration-200 gap-3 hover:bg-white/5 text-left active:scale-[0.98]",
                    dropdownOpen && "bg-white/5 shadow-inner"
                )}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
            >
                {user.image ? (
                    <img src={user.image} className="h-8 w-8 shrink-0 rounded-full border border-white/10" alt={displayName} />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/90 border border-white/5">
                        {initials}
                    </div>
                )}

                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="overflow-hidden flex flex-col min-w-0 flex-1"
                    aria-hidden={!open}
                >
                    <span className="truncate capitalize text-[13.5px] font-medium text-white leading-tight">
                        {displayName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {roleName ? (
                            <RoleBadge roleName={roleName} />
                        ) : (
                            user.email && (
                                <span className="truncate text-[11px] text-white/40 leading-tight">
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
                    className="overflow-hidden shrink-0"
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
                            "absolute z-50 bottom-full mb-3 rounded-2xl overflow-hidden p-1.5",
                            "bg-[#2a2a2c] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
                            open ? "left-0 right-0" : "left-0 w-56"
                        )}
                    >
                        <div className="px-3 py-3 mb-1">
                            <p className="text-[13px] font-semibold text-white truncate">{displayName}</p>
                            <p className="text-[11px] text-white/40 truncate mt-0.5">{user.email}</p>
                        </div>
                        
                        <div className="space-y-0.5">
                            <Link
                                href={`/${orgSlug}/settings`}
                                role="menuitem"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <GearIcon className="h-4 w-4 shrink-0" />
                                Settings
                            </Link>
                            <div className="h-px bg-white/5 mx-2 my-1" />
                            <button
                                role="menuitem"
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="flex items-center gap-2.5 px-3 py-2 w-full text-[13px] text-white/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
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

// ─── Main Sidebar ────────────────────────────────────────────
export function AppSidebar({ orgSlug, orgName, roleName, permissions, user }: AppSidebarProps) {
    const [open, setOpen] = useState(true);
    const pathname = usePathname();

    const allNavGroups = useMemo(
        () => filterNavByPermissions(permissions),
        [permissions]
    );

    // Total nav items this role can see — used to decide if search is worth showing.
    // Employees typically have ≤5 items; admins/HR have many more.
    const totalNavItems = useMemo(
        () => allNavGroups.reduce((sum, group) => sum + group.items.length, 0),
        [allNavGroups]
    );
    const showSearch = totalNavItems > 6;

    return (
        <Sidebar open={open} setOpen={setOpen} animate={true}>
            <SidebarBody className="justify-between gap-4 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-divider)]">
                <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto no-scrollbar gap-3">
                    <LogoRow orgName={orgName} orgSlug={orgSlug} />
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
