"use client";

import { useState } from "react";
import { Eye, EyeOff, Shuffle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateStrongPassword } from "@/lib/password";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
    onGenerate?: (password: string) => void;
    showGenerator?: boolean;
}

export function PasswordInput({
    className,
    onGenerate,
    showGenerator = false,
    ...props
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const handleGenerate = () => {
        const newPassword = generateStrongPassword();
        onGenerate?.(newPassword);
    };

    return (
        <div className="relative">
            <Input
                {...props}
                type={showPassword ? "text" : "password"}
                className={cn(
                    showGenerator ? "pr-[4.5rem]" : "pr-10",
                    className
                )}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {showGenerator && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleGenerate}
                        title="Generate strong password"
                        aria-label="Generate strong password"
                        className="size-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
                    >
                        <Shuffle className="size-3.5" aria-hidden="true" />
                    </Button>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="size-8 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
                >
                    {showPassword ? (
                        <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                        <Eye className="size-3.5" aria-hidden="true" />
                    )}
                </Button>
            </div>
        </div>
    );
}
