import type { ReactNode } from "react";
import Image from "next/image";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen flex bg-background">
            {/* ── Left panel (The Museum Gallery) ───────────────────── */}
            <aside
                className="hidden lg:flex lg:w-1/2 shrink-0 relative overflow-hidden bg-secondary"
            >
                {/* Background Image */}
                <Image 
                    src="/login_bg_museum_1778047797888.png" 
                    alt="Museum Gallery" 
                    fill
                    priority
                    className="object-cover"
                />
                {/* Overlay for depth */}
                <div className="absolute inset-0 bg-black/5" />

                {/* Logo Focus */}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-6">
                        <div
                            className="size-16 rounded-2xl bg-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105 duration-500"
                            aria-hidden="true"
                        >
                            {/* 2×2 grid mark — Kovan Labs brand */}
                            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="2" width="5" height="5" rx="1" fill="var(--primary)" />
                                <rect x="9" y="2" width="5" height="5" rx="1" fill="var(--primary)" fillOpacity="0.7" />
                                <rect x="2" y="9" width="5" height="5" rx="1" fill="var(--primary)" fillOpacity="0.7" />
                                <rect x="9" y="9" width="5" height="5" rx="1" fill="var(--primary)" fillOpacity="0.4" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                            Kovan Labs
                        </h1>
                    </div>
                </div>

                {/* Subtle legal anchor */}
                <p className="absolute bottom-10 left-12 text-xs text-white/60 font-medium">
                    &copy; {new Date().getFullYear()} Kovan Labs. All rights reserved.
                </p>
            </aside>

            {/* ── Right panel (The Interaction Surface) ─────────────── */}
            <main
                className="flex flex-1 flex-col items-center justify-center min-h-screen px-6 py-12 lg:px-20"
            >
                <div className="w-full max-w-[420px] transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                    {children}
                </div>
            </main>
        </div>
    );
}
