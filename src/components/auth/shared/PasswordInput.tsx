"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, Shuffle } from "lucide-react";
import { generateStrongPassword } from "@/lib/password";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
    readonly onGenerate?: (password: string) => void;
    readonly showGenerator?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
    { className, onGenerate, showGenerator = false, ...props },
    ref,
) {
    const [showPassword, setShowPassword] = useState(false);

    const handleGenerate = () => {
        const newPassword = generateStrongPassword();
        onGenerate?.(newPassword);
    };

    return (
        <div className="relative w-full">
            <input
                ref={ref}
                {...props}
                type={showPassword ? "text" : "password"}
                className={cn(
                    "form-input w-full",
                    showGenerator ? "pr-[4.5rem]" : "pr-10",
                    className
                )}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
                {showGenerator && (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        title="Generate strong password"
                        aria-label="Generate strong password"
                        className="size-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                    >
                        <Shuffle className="size-3.5" aria-hidden="true" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="size-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                >
                    {showPassword ? (
                        <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                        <Eye className="size-3.5" aria-hidden="true" />
                    )}
                </button>
            </div>
        </div>
    );
});
