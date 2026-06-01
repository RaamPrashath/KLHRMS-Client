"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";

interface SocialButtonsProps {
    readonly onError?: (error: string) => void;
}

const MicrosoftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
);

const providers = [
    { id: "microsoft" as const, label: "Microsoft", Icon: MicrosoftIcon },
] as const;

export function SocialButtons({ onError }: SocialButtonsProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSocialLogin = async (provider: "microsoft" | "github" | "google") => {
        try {
            setLoading(provider);
            await authClient.signOut();
            const result = await authClient.signIn.social({
                provider,
                callbackURL: "/post-auth",
            });
            if (result.error) {
                throw new Error(result.error.message ?? "Social login failed");
            }
        } catch (error) {
            onError?.(error instanceof Error ? error.message : "Social login failed");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-3" role="group" aria-label="Continue with a provider">
            {providers.map(({ id, label, Icon }) => (
                <Button
                    key={id}
                    type="button"
                    variant="outline"
                    className="h-12 border-border bg-secondary/30 hover:bg-white hover:shadow-sm text-foreground rounded-xl transition-all duration-200 active:scale-[0.98]"
                    onClick={() => handleSocialLogin(id)}
                    disabled={loading !== null}
                    aria-label={`Continue with ${label}`}
                    title={`Continue with ${label}`}
                >
                    {loading === id ? (
                        <span className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" aria-hidden="true" />
                    ) : (
                        <span className="inline-flex items-center gap-2">
                            <Icon />
                            <span className="text-sm font-medium">{label}</span>
                        </span>
                    )}
                </Button>
            ))}
        </div>
    );
}
