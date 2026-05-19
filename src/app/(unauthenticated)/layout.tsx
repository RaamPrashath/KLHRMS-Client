import type { ReactNode } from "react";
import Image from "next/image";
import { Meteors } from "@/components/ui/meteors";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen flex bg-background">
            {/* ── Left panel (Cosmic Workspace) ── */}
            <aside
                className="hidden lg:flex lg:w-1/2 shrink-0 relative overflow-hidden bg-[#0A0A0E]"
            >
                {/* Dark cosmic background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0E] via-[#101015] to-[#000000] z-0" />
                
                {/* Meteor Effect */}
                <Meteors number={40} className="z-10" />

                {/* Logo Focus - Match image exactly with ultra-premium glassmorphism */}
                <div className="relative z-20 w-full h-full flex flex-col items-center justify-center">
                    <div className="relative overflow-hidden flex flex-col items-center justify-center w-[360px] lg:w-[380px] h-[220px] rounded-[24px] bg-gradient-to-b from-[#181820]/50 to-[#0A0A0F]/50 border border-white/[0.06] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-xl gap-7">
                        {/* Soft background light sweep */}
                        <div className="absolute -inset-x-20 top-0 h-40 bg-gradient-to-b from-white/[0.02] to-transparent blur-md pointer-events-none" />
                        
                        <Image
                            src="/kovan-logo.svg"
                            alt="Kovan Labs"
                            width={210}
                            height={44}
                            priority
                            className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-95 transition-all duration-300"
                        />
                        
                        <p className="text-white/30 text-[10px] tracking-[0.25em] uppercase font-bold font-sans">
                            HRMS SYSTEM
                        </p>
                    </div>
                </div>

                {/* Subtle legal anchor */}
                <p className="absolute bottom-10 left-12 text-xs text-white/30 font-medium z-20 tracking-wide">
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
