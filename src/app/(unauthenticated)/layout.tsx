import type { ReactNode } from "react";
import Image from "next/image";
import { Meteors } from "@/components/ui/meteors";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen flex bg-background">
            {/* ── Left panel (Pristine Gallery Workspace) ── */}
            <aside
                className="hidden lg:flex lg:w-1/2 shrink-0 relative overflow-hidden bg-gradient-to-br from-[#f5f5f7] via-[#fafafc] to-[#e5e5ea] border-r border-[#e5e5ea]"
            >
                {/* Logo Focus - Light glassmorphism card */}
                <div className="relative z-20 w-full h-full flex flex-col items-center justify-center">
                    <div className="relative overflow-hidden flex flex-col items-center justify-center w-[360px] lg:w-[380px] h-[220px] rounded-[24px] bg-white/40 border border-white/60 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl gap-7">
                        <div className="absolute -inset-x-20 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent blur-md pointer-events-none" />
                        
                        <Image
                            src="/kovan-logo.svg"
                            alt="Kovan Labs"
                            width={210}
                            height={44}
                            priority
                            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.02)] opacity-95 transition-all duration-300"
                        />
                        
                        <p className="text-neutral-500/70 text-[10px] tracking-[0.25em] uppercase font-bold font-sans">
                            HRMS SYSTEM
                        </p>
                    </div>
                </div>

                {/* Subtle legal anchor */}
                <p className="absolute bottom-10 left-12 text-xs text-neutral-500/70 font-medium z-20 tracking-wide">
                    &copy; {new Date().getFullYear()} Kovan Labs. All rights reserved.
                </p>
            </aside>

            {/* ── Right panel (The Interaction Surface) ─────────────── */}
            <main
                className="flex flex-1 flex-col relative overflow-y-auto min-h-screen"
            >
                <div className="flex flex-col justify-center items-center w-full min-h-full px-6 py-12 lg:px-20">
                    <div className="w-full max-w-[420px] transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 my-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
