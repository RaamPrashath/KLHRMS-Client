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
                    <div className="flex flex-col items-center gap-0">
                        <Image
                            src="/kovan-logo.svg"
                            alt="Kovan Labs"
                            width={260}
                            height={57}
                            priority
                            
                        />
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
