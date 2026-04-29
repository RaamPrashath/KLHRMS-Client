import { cn } from "@/lib/utils";

interface AuthCardProps {
    readonly children: React.ReactNode;
    readonly className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
    return (
        <div
            className={cn(
                "w-full max-w-sm bg-card border border-border rounded-2xl shadow-sm p-8",
                className
            )}
        >
            {children}
        </div>
    );
}
