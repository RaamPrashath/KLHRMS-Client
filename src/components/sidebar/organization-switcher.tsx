"use client";

import { useState } from "react";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface SidebarOrganizationOption {
    slug: string;
    name: string;
    roleName: string | null;
}

interface OrganizationSwitcherProps {
    currentOrgSlug: string;
    organizations: SidebarOrganizationOption[];
}

function getInitials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

export function OrganizationSwitcher({
    currentOrgSlug,
    organizations,
}: OrganizationSwitcherProps) {
    const router = useRouter();
    const { open, setOpen } = useSidebar();
    const [isOpen, setIsOpen] = useState(false);
    
    const currentOrg = organizations.find((org) => org.slug === currentOrgSlug) ?? organizations[0];

    if (!currentOrg) {
        return null;
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-[10px] bg-zinc-950 dark:bg-zinc-100 text-[13px] font-bold text-white dark:text-zinc-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform hover:scale-[1.02]"
                aria-label="Open organization switcher"
            >
                {getInitials(currentOrg.name)}
            </button>
        );
    }

    return (
        <div className="flex-1 pt-1 pb-1">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex w-full items-center justify-between rounded-xl p-2 px-3 text-left transition-all duration-200 outline-none hover:bg-slate-100/80 dark:hover:bg-zinc-900 cursor-pointer select-none",
                            isOpen && "bg-slate-100/80 dark:bg-zinc-900",
                        )}
                    >
                        <div className="flex min-w-0 flex-1 items-center">
                            <h3 className="text-[19px] font-bold tracking-tight text-slate-800 dark:text-zinc-50 truncate pl-0.5">
                                {currentOrg.name}
                            </h3>
                        </div>

                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400 hover:text-slate-600" />
                    </button>
                </PopoverTrigger>

                <PopoverContent 
                    className="w-(--radix-popover-trigger-width) min-w-60 rounded-2xl border border-slate-100 bg-white p-1.5 text-slate-900 shadow-[0_24px_64px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)]" 
                    align="start"
                    sideOffset={6}
                >
                    <Command className="bg-transparent text-[var(--color-foreground)] border-none shadow-none">
                        <CommandInput
                            placeholder="Search..."
                            className="border-0 text-[var(--color-foreground)] placeholder:text-[var(--color-neutral-400)] dark:placeholder:text-white/35 focus:ring-0 focus-visible:outline-none"
                        />
                        <CommandList className="max-h-60 mt-2 no-scrollbar">
                            <CommandEmpty className="py-4 text-xs text-[var(--color-sidebar-text)] text-center">
                                No organizations found.
                            </CommandEmpty>
                            
                            <CommandGroup heading="Your organizations" className="text-[var(--color-sidebar-text)] px-1 py-1">
                                {organizations.map((org) => {
                                    const isSelected = org.slug === currentOrgSlug;
                                    return (
                                        <CommandItem
                                            key={org.slug}
                                            value={org.name}
                                            onSelect={() => {
                                                setIsOpen(false);
                                                router.push(`/${org.slug}`);
                                                router.refresh();
                                            }}
                                            className={cn(
                                                "flex items-center justify-between rounded-xl px-3 py-2.5 text-[var(--color-sidebar-accent-foreground)] transition-colors cursor-pointer aria-selected:bg-[var(--color-sidebar-accent)] aria-selected:text-[var(--color-sidebar-accent-foreground)]",
                                                isSelected && "bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-foreground)]"
                                            )}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-sidebar-accent)] text-[10px] font-semibold text-[var(--color-sidebar-accent-foreground)] border border-[var(--border)] dark:bg-white/8 dark:text-white/80 dark:border-white/5">
                                                    {getInitials(org.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold">{org.name}</p>
                                                    <p className="truncate text-[11px] text-[var(--color-sidebar-text)]">{org.roleName ?? "Employee Workspace"}</p>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="h-4 w-4 shrink-0 text-[var(--color-sidebar-accent-foreground)]" />
                                            )}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                            
                            <CommandSeparator className="my-2 bg-[var(--color-sidebar-border)]" />
                            
                            <CommandGroup className="px-1 py-1">
                                <CommandItem
                                    value="__create__"
                                    onSelect={() => {
                                        setIsOpen(false);
                                        router.push("/create-organization");
                                        router.refresh();
                                    }}
                                    className="rounded-xl border border-dashed border-[var(--border)] dark:border-white/10 px-3 py-2.5 text-[var(--color-sidebar-accent-foreground)] transition-colors cursor-pointer aria-selected:bg-[var(--color-sidebar-accent)] aria-selected:text-[var(--color-sidebar-accent-foreground)]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-foreground)] shrink-0">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Create organization</p>
                                            <p className="text-[11px] text-[var(--color-sidebar-text)]">Start a new workspace</p>
                                        </div>
                                    </div>
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
