interface AuthHeaderProps {
    title: string;
    subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
            {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
        </div>
    );
}
