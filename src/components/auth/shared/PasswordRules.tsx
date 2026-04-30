import { CheckCircle2, Circle } from "lucide-react";
import { checkPasswordRules } from "@/lib/password";
import { cn } from "@/lib/utils";

interface PasswordRulesProps {
    password: string;
}

export function PasswordRules({ password }: PasswordRulesProps) {
    const rules = checkPasswordRules(password);

    return (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
            {rules.map((rule) => (
                <div
                    key={rule.id}
                    className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors",
                        rule.passed ? "text-success-text" : "text-neutral-400"
                    )}
                >
                    {rule.passed ? (
                        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                        <Circle className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{rule.label}</span>
                </div>
            ))}
        </div>
    );
}
