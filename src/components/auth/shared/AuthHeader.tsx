interface AuthHeaderProps {
    title: string;
    subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <div className="mb-10 text-center lg:text-left">
            <h1 className="text-[32px] font-semibold text-foreground tracking-[-0.02em] leading-tight">
                {title}
            </h1>
            {subtitle && (
                <p className="mt-3 text-[17px] text-muted-foreground leading-relaxed font-normal">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
