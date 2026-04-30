import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface UnauthenticatedLayoutProps {
    children: ReactNode;
}

const features = [
    "Real-time attendance tracking",
    "Leave and approval workflows",
    "Payroll and compliance",
];

export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
    return (
        <div className="min-h-screen flex">
            {/* ── Left panel ─────────────────────────────────────────── */}
            <aside
                className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between bg-[var(--color-sidebar-bg)] px-12 py-10"
            >
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div
                        className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0"
                        aria-hidden="true"
                    >
                        {/* 2×2 grid mark — Kovan Labs brand */}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.7" />
                            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.7" />
                            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.4" />
                        </svg>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-sidebar-text-hover)] tracking-tight">
                        Kovan Labs
                    </span>
                </div>

                {/* Hero copy */}
                <div className="space-y-7">
                    <div className="space-y-3">
                        <h2 className="text-[2.25rem] font-semibold leading-[1.12] tracking-[-0.04em] text-[var(--color-sidebar-text-hover)]">
                            People operations,{" "}
                            <span className="text-primary-light">simplified.</span>
                        </h2>
                        <p className="text-sm text-[var(--color-sidebar-text)] leading-relaxed max-w-[300px]">
                            Attendance, payroll, and team management in one place.
                        </p>
                    </div>

                    <ul className="space-y-3.5" role="list">
                        {features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2.5">
                                <CheckCircle2
                                    className="size-4 shrink-0 text-primary-light"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                                <span className="text-[13px] text-[var(--color-sidebar-text)]">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer */}
                <p className="text-xs text-[var(--color-sidebar-label)]">
                    &copy; {new Date().getFullYear()} Kovan Labs. All rights reserved.
                </p>
            </aside>

            {/* ── Right panel ────────────────────────────────────────── */}
            <main
                className="flex flex-1 flex-col items-center justify-center min-h-screen px-6 py-12 bg-canvas"
            >
                <div className="w-full max-w-[400px]">
                    {children}
                </div>
            </main>
        </div>
    );
}
