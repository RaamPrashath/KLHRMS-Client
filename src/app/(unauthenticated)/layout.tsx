import type { ReactNode } from "react";
import { WaveBackground } from "@/components/auth/shared/WaveBackground";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] relative font-sans overflow-x-hidden">
            {/* Interactive WebGL background wave */}
            <WaveBackground />

            {/* Accessible screen-reader heading */}
            <h1 className="sr-only">KL HRMS Portal</h1>

            {/* Left sidebar container overlays the background */}
            <main className="ui-overlay" id="interactive-overlay">
                {children}
            </main>
        </div>
    );
}

