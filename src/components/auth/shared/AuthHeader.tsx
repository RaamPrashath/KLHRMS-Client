import { cn } from "@/lib/utils";

interface AuthHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
}

export function AuthHeader({ title, subtitle, className }: AuthHeaderProps) {
    return (
        <div className={cn("mb-6 lg:mb-8 text-center lg:text-left", className)}>
            <h1 className="text-[32px] font-semibold text-foreground tracking-[-0.02em] leading-tight">
                {title}
            </h1>
            {subtitle && (
                <p className="mt-2.5 text-[16px] lg:text-[17px] text-muted-foreground leading-relaxed font-normal">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
