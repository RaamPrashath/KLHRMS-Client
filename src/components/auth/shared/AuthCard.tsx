import { cn } from "@/lib/utils";

interface AuthCardProps {
    readonly children: React.ReactNode;
    readonly className?: string;
}

/**
 * Auth surface — no card border on the right panel; the canvas itself is the surface.
 * Keeps the max-width constraint and vertical rhythm.
 */
export function AuthCard({ children, className }: AuthCardProps) {
    return (
        <div className={cn("w-full", className)}>
            {children}
        </div>
    );
}
