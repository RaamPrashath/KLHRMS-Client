"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "@radix-ui/react-icons";
import {
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
    MessageSquare,
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
    type HrmsRole,
    filterNavByRole,
    HRMS_ROLE_LABELS,
    HRMS_ROLE_BADGE_COLORS,
} from "@/lib/hrms-roles";

// ─── Types ───────────────────────────────────────────────────
export interface AppSidebarProps {
    orgSlug: string;
    orgName: string;
    hrmsRole: HrmsRole | null;
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
    "interviews":          <MessageSquare className={ic} />,
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
            className="hidden md:flex items-center justify-center h-7 w-7 rounded-md shrink-0 transition-colors duration-150 text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)] hover:bg-[rgba(255,255,255,0.07)]"
        >
            <motion.span
                initial={false}
                animate={{ rotate: open ? 0 : 180 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="flex items-center justify-center"
            >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
            </motion.span>
        </motion.button>
    ) : null;

    return (
        <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center min-w-0">
                <a
                    href={`/${orgSlug}`}
                    aria-label={orgName}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white text-sm font-bold shadow-sm"
                >
                    {orgName.charAt(0).toUpperCase()}
                </a>

                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="overflow-hidden flex flex-col min-w-0 ml-3"
                    aria-hidden={!open}
                >
                    <span className="truncate text-sm font-semibold text-[var(--color-sidebar-text-hover)] whitespace-nowrap">
                        {orgName}
                    </span>
                    <span className="truncate text-xs text-[var(--color-sidebar-label)] whitespace-nowrap">
                        HR Management
                    </span>
                </motion.div>

                <motion.div
                    initial={false}
                    animate={{ width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="overflow-hidden flex-1"
                    aria-hidden
                />

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

// ─── Role Badge ───────────────────────────────────────────────
function RoleBadge({ role }: { role: HrmsRole }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none",
                HRMS_ROLE_BADGE_COLORS[role],
            )}
        >
            {HRMS_ROLE_LABELS[role]}
        </span>
    );
}

// ─── User Dropdown Footer ─────────────────────────────────────
function UserFooter({
    user,
    orgSlug,
    hrmsRole,
}: {
    user: AppSidebarProps["user"];
    orgSlug: string;
    hrmsRole: HrmsRole | null;
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
        <div ref={dropdownRef} className="relative border-t border-[var(--color-sidebar-divider)] pt-3">
            <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={cn(
                    "flex items-center w-full rounded-md px-2 py-2 transition-colors duration-150 gap-2 hover:bg-[rgba(255,255,255,0.05)] text-left",
                    dropdownOpen && "bg-[rgba(255,255,255,0.05)]"
                )}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
            >
                {user.image ? (
                    <img src={user.image} className="h-7 w-7 shrink-0 rounded-full" alt={displayName} />
                ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-neutral-700)] text-[10px] font-bold text-white">
                        {initials}
                    </div>
                )}

                {/* Name + role badge — clips when collapsed */}
                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="overflow-hidden flex flex-col min-w-0 flex-1"
                    aria-hidden={!open}
                >
                    <span className="truncate capitalize mb-1 text-sm font-medium text-[var(--color-sidebar-text-hover)] leading-tight whitespace-nowrap">
                        {displayName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {hrmsRole ? (
                            <RoleBadge role={hrmsRole} />
                        ) : (
                            user.email && (
                                <span className="truncate text-xs text-[var(--color-sidebar-label)] leading-tight whitespace-nowrap">
                                    {user.email}
                                </span>
                            )
                        )}
                    </div>
                </motion.div>

                {/* Dots icon — clips when collapsed */}
                <motion.div
                    initial={false}
                    animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                    transition={labelTransition}
                    className="overflow-hidden shrink-0"
                    aria-hidden={!open}
                >
                    <DotsHorizontalIcon className="h-3.5 w-3.5 text-[var(--color-sidebar-label)]" />
                </motion.div>
            </button>

            <AnimatePresence>
                {dropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                        role="menu"
                        className={cn(
                            "absolute z-50 bottom-full mb-2 rounded-lg overflow-hidden",
                            "bg-[#2a2a2c] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
                            open ? "left-0 right-0" : "left-0 w-52"
                        )}
                    >
                        <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
                            <p className="text-sm font-medium text-[var(--color-sidebar-text-hover)] truncate">{displayName}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                {hrmsRole ? (
                                    <RoleBadge role={hrmsRole} />
                                ) : (
                                    user.email && (
                                        <p className="text-xs text-[var(--color-sidebar-label)] truncate">{user.email}</p>
                                    )
                                )}
                            </div>
                        </div>
                        <Link
                            href={`/${orgSlug}/settings`}
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100"
                        >
                            <GearIcon className="h-4 w-4 shrink-0" />
                            Settings
                        </Link>
                        <div className="h-px bg-[rgba(255,255,255,0.06)] mx-2" />
                        <button
                            role="menuitem"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="flex items-center gap-2.5 px-3 py-2 w-full text-sm text-[var(--color-sidebar-text)] hover:text-[var(--color-destructive)] hover:bg-[rgba(234,67,53,0.08)] transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ExitIcon className="h-4 w-4 shrink-0" />
                            {isSigningOut ? "Signing out..." : "Log out"}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Sidebar ────────────────────────────────────────────
export function AppSidebar({ orgSlug, orgName, hrmsRole, user }: AppSidebarProps) {
    const [open, setOpen] = useState(true);
    const pathname = usePathname();

    // Filter nav groups based on the user's HRMS role
    const navGroups = filterNavByRole(hrmsRole);

    return (
        <Sidebar open={open} setOpen={setOpen} animate={true}>
            <SidebarBody className="justify-between gap-4 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-divider)]">
                <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto no-scrollbar gap-3">
                    <LogoRow orgName={orgName} orgSlug={orgSlug} />

                    {navGroups.length === 0 ? (
                        // No role assigned yet — show a placeholder
                        <div className="px-2 py-4 text-xs text-[var(--color-sidebar-label)] text-center leading-relaxed">
                            No role assigned.
                            <br />
                            Contact your admin.
                        </div>
                    ) : (
                        <nav className="flex flex-col gap-3.5 mt-1">
                            {navGroups.map((group) => (
                                <div key={group.title} className="flex flex-col gap-0.5">
                                    <SidebarLabel>{group.title}</SidebarLabel>
                                    {group.items.map((item) => {
                                        const url = `/${orgSlug}/${item.urlSuffix}`;
                                        const isActive = pathname === url;
                                        const icon = NAV_ICONS[item.urlSuffix];

                                        return (
                                            <SidebarLink
                                                key={item.title}
                                                isActive={isActive}
                                                link={{
                                                    label: item.title,
                                                    href: url,
                                                    icon: icon
                                                        ? React.cloneElement(icon, {
                                                            className: cn(
                                                                ic,
                                                                isActive
                                                                    ? "text-[var(--color-sidebar-active-text)]"
                                                                    : "text-[var(--color-sidebar-text)]"
                                                            ),
                                                        })
                                                        : null,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </nav>
                    )}
                </div>

                <UserFooter user={user} orgSlug={orgSlug} hrmsRole={hrmsRole} />
            </SidebarBody>
        </Sidebar>
    );
}
