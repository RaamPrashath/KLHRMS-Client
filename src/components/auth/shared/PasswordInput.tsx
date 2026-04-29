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
                className={cn("pr-20", className)}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {showGenerator && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleGenerate}
                        title="Generate strong password"
                    >
                        <Shuffle className="size-4" />
                    </Button>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
