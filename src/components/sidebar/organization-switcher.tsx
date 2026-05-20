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
                className="mx-auto mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(98,86,255,0.96),rgba(88,74,243,0.9))] text-xs font-semibold text-white shadow-[0_10px_22px_rgba(73,61,214,0.34)] transition-transform hover:scale-[1.02]"
                aria-label="Open organization switcher"
            >
                {getInitials(currentOrg.name)}
            </button>
        );
    }

    return (
        <div className="py-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className={cn(
                        "flex w-full items-center justify-between rounded-[18px] px-3.5 py-3.5 text-left transition-all duration-200",
                        isOpen && "bg-white/5",
                    )}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[17px] font-bold text-white shadow-[0_10px_22px_rgba(73,61,214,0.34)]">
                            {getInitials(currentOrg.name)}
                        </div>

                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[1.02rem] font-semibold leading-tight tracking-[-0.02em] text-white break-words">
                                {currentOrg.name}
                            </p>
                            <p className="pt-1 text-[0.84rem] font-medium leading-tight text-white/52 break-words">
                                {currentOrg.roleName ?? "Employee Workspace"}
                            </p>
                        </div>
                    </div>

                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                            aria-expanded={isOpen}
                            aria-label="Open organization switcher"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl">
                                <ChevronsUpDown className="h-4 w-4" />
                            </div>
                        </button>
                    </PopoverTrigger>
                </div>

                <PopoverContent 
                    className="w-(--radix-popover-trigger-width) min-w-60 rounded-2xl border border-white/10 bg-[#1C1C1E] p-1.5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-md" 
                    align="start"
                    sideOffset={6}
                >
                    <Command className="bg-transparent text-white border-none shadow-none">
                        <CommandInput
                            placeholder="Search..."
                            className="border-0 text-white placeholder:text-white/35 focus:ring-0 focus-visible:outline-none"
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
                                                    <p className="truncate text-[11px] text-white/45">{org.roleName ?? "Employee Workspace"}</p>
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
