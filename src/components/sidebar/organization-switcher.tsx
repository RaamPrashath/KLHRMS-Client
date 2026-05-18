"use client";

import { useMemo } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import { useSidebar } from "@/components/ui/sidebar";

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
    const currentOrg = organizations.find((org) => org.slug === currentOrgSlug) ?? organizations[0];

    const otherOrganizations = useMemo(
        () => organizations.filter((org) => org.slug !== currentOrgSlug),
        [currentOrgSlug, organizations],
    );

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

            <Combobox
                value={currentOrg.name}
                onValueChange={(value) => {
                    const nextValue = value as string;
                    if (nextValue === "__create__") {
                        router.push("/create-organization");
                        router.refresh();
                        return;
                    }

                    const selectedOrg = organizations.find((org) => org.name === nextValue);
                    if (!selectedOrg) return;

                    router.push(`/${selectedOrg.slug}`);
                    router.refresh();
                }}
            >
                <div className="flex items-center rounded-2xl border border-white/8 bg-white/6 px-3 py-2.5">
                    <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold text-white">
                        {getInitials(currentOrg.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <ComboboxInput
                            placeholder="Switch organization"
                            showTrigger={false}
                            showClear={false}
                            className="w-full border-0 bg-transparent p-0 text-white [&>div]:h-auto [&>div]:border-0 [&>div]:bg-transparent [&>div]:px-0 [&>div]:py-0 [&>div]:shadow-none [&_input]:p-0 [&_input]:text-sm [&_input]:font-medium [&_input]:text-white [&_input]:placeholder:text-white/35"
                        />
                        <p className="truncate pt-0.5 text-[11px] text-white/45">
                            {currentOrg.roleName ?? "Member"}
                        </p>
                    </div>
                    <ComboboxTrigger className="ml-2 text-white/45" />
                </div>

                <ComboboxContent className="rounded-2xl border border-white/10 bg-[#222325] p-1 text-white shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
                    <ComboboxList>
                        {otherOrganizations.length === 0 ? (
                            <ComboboxEmpty className="py-4 text-white/45">
                                No other organizations
                            </ComboboxEmpty>
                        ) : (
                            otherOrganizations.map((org) => (
                                <ComboboxItem
                                    key={org.slug}
                                    value={org.name}
                                    className="rounded-xl px-3 py-2.5 text-white/85 data-highlighted:bg-white/8 data-highlighted:text-white"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[10px] font-semibold text-white/80">
                                            {getInitials(org.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{org.name}</p>
                                            <p className="truncate text-[11px] text-white/45">/{org.slug}</p>
                                        </div>
                                    </div>
                                </ComboboxItem>
                            ))
                        )}
                        <ComboboxItem
                            value="__create__"
                            className="mt-1 rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-white/85 data-highlighted:bg-white/8 data-highlighted:text-white"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Create organization</p>
                                    <p className="text-[11px] text-white/45">Start a new workspace</p>
                                </div>
                            </div>
                        </ComboboxItem>
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}
