interface AuthHeaderProps {
    title: string;
    subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <div className="mb-7">
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight leading-snug">
                {title}
            </h1>
            {subtitle && (
                <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
