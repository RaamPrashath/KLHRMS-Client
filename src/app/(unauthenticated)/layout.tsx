import type { ReactNode } from "react";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen flex">
            {/* Left panel — black placeholder, hidden on mobile */}
            <div
                className="hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center"
                aria-hidden="true"
            >
                <div className="text-white/10 text-7xl font-bold select-none tracking-tight">
                    KL
                </div>
            </div>

            {/* Right panel — auth form area */}
            <main
                className="flex w-full lg:w-1/2 flex-col items-center justify-center min-h-screen px-6 py-12 bg-background"
                role="main"
            >
                <div className="w-full max-w-sm">
                    {children}
                </div>
            </main>
        </div>
    );
}
