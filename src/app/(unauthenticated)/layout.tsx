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
                className="hidden lg:flex lg:w-1/2 shrink-0 relative overflow-hidden bg-[#1e2a5e] border-r border-white/10"
            >
                {/* SVG Atmospheric Background */}
                <svg
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="40" />
                        </filter>
                    </defs>
                    
                    {/* Soft glow blobs */}
                    <ellipse cx="85%" cy="20%" rx="70" ry="70" fill="rgba(100,80,255,0.10)" filter="url(#glow-blur)" />
                    <ellipse cx="15%" cy="80%" rx="55" ry="55" fill="rgba(60,100,255,0.08)" filter="url(#glow-blur)" />

                    {/* Large anchor circles */}
                    <circle cx="-30" cy="60" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <circle cx="-30" cy="60" r="140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <circle cx="-30" cy="60" r="190" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                    <circle cx="110%" cy="100%" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <circle cx="110%" cy="100%" r="160" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                    {/* Floating rotated rectangles */}
                    <rect x="80%" y="15%" width="50" height="50" rx="8" ry="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" style={{ transform: "rotate(18deg)", transformOrigin: "80% 15%" }} />
                    <rect x="15%" y="45%" width="60" height="60" rx="8" ry="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" style={{ transform: "rotate(-12deg)", transformOrigin: "15% 45%" }} />
                    <rect x="50%" y="75%" width="45" height="45" rx="8" ry="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" style={{ transform: "rotate(25deg)", transformOrigin: "50% 75%" }} />

                    {/* Dot scatter */}
                    <circle cx="25%" cy="15%" r="3" fill="#fff" opacity="0.12" />
                    <circle cx="70%" cy="30%" r="2" fill="#fff" opacity="0.08" />
                    <circle cx="85%" cy="60%" r="4" fill="#fff" opacity="0.18" />
                    <circle cx="40%" cy="50%" r="2.5" fill="#fff" opacity="0.15" />
                    <circle cx="20%" cy="80%" r="3.5" fill="#fff" opacity="0.1" />
                    <circle cx="60%" cy="85%" r="2" fill="#fff" opacity="0.2" />
                    <circle cx="35%" cy="25%" r="3" fill="#fff" opacity="0.14" />
                </svg>

                {/* Logo Focus - Light glassmorphism card */}
                {/* <div className="relative z-20 w-full h-full flex flex-col items-center justify-center">
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
                </div> */}

                {/* Subtle legal anchor */}
                <p className="absolute bottom-[24px] left-[32px] text-[12px] text-[rgba(255,255,255,0.30)] tracking-[0.3px] font-medium z-20">
                    © 2026 Kovan Labs. All rights reserved.
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
