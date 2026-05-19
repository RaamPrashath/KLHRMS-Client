"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Plus, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
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
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/6 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                aria-label="Open organization switcher"
            >
                {getInitials(currentOrg.name)}
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-3 px-1 py-2">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Organization
                </p>
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Collapse sidebar"
                >
                    <ChevronLeft className="h-4 w-4" />
                </motion.button>
            </div>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/10 active:scale-[0.98] outline-none",
                            isOpen && "bg-white/10 shadow-inner"
                        )}
                        aria-expanded={isOpen}
                        aria-label="Organization switcher"
                    >
                        <div className="flex items-center min-w-0">
                            {/* Left: Avatar */}
                            <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold text-white border border-white/5">
                                {getInitials(currentOrg.name)}
                            </div>
                            
                            {/* Center: Text Details */}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                    {currentOrg.name}
                                </p>
                                <p className="truncate pt-0.5 text-[11px] text-white/45 font-medium">
                                    {currentOrg.roleName ?? "Member"}
                                </p>
                            </div>
                        </div>
                        
                        {/* Right: ChevronsUpDown pill button */}
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#3E3E3F] text-white/80 transition-colors hover:bg-white/15">
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                        </div>
                    </button>
                </PopoverTrigger>

                <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] min-w-[240px] rounded-2xl border border-white/10 bg-[#1C1C1E] p-1.5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-md" 
                    align="start"
                    sideOffset={6}
                >
                    <Command className="bg-transparent text-white border-none shadow-none">
                        <CommandInput
                            placeholder="Search..."
                            className="text-white placeholder:text-white/35 border-0 focus:ring-0 outline-none"
                        />
                        <CommandList className="max-h-60 mt-2 no-scrollbar">
                            <CommandEmpty className="py-4 text-xs text-white/45 text-center">
                                No organizations found.
                            </CommandEmpty>
                            
                            <CommandGroup heading="Your organizations" className="text-white/40 px-1 py-1">
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
                                                "flex items-center justify-between rounded-xl px-3 py-2.5 text-white/85 transition-colors cursor-pointer aria-selected:bg-white/8 aria-selected:text-white",
                                                isSelected && "bg-white/5 text-white"
                                            )}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[10px] font-semibold text-white/80 border border-white/5">
                                                    {getInitials(org.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold">{org.name}</p>
                                                    <p className="truncate text-[11px] text-white/45">/{org.slug}</p>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="h-4 w-4 shrink-0 text-white" />
                                            )}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                            
                            <CommandSeparator className="my-2 bg-white/5" />
                            
                            <CommandGroup className="px-1 py-1">
                                <CommandItem
                                    value="__create__"
                                    onSelect={() => {
                                        setIsOpen(false);
                                        router.push("/create-organization");
                                        router.refresh();
                                    }}
                                    className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-white/85 transition-colors cursor-pointer aria-selected:bg-white/8 aria-selected:text-white"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 shrink-0">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Create organization</p>
                                            <p className="text-[11px] text-white/45">Start a new workspace</p>
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
