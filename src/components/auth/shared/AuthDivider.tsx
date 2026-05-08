import { cn } from "@/lib/utils";

interface AuthDividerProps {
    text?: string;
    className?: string;
}

export function AuthDivider({
    text = "OR CONTINUE WITH",
    className,
}: AuthDividerProps) {
    return (
        <div className={cn("relative my-5", className)}>
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-100" />
            </div>
            <div className="relative flex justify-center text-[11px] font-medium tracking-wider">
                <span className="bg-canvas px-3 text-neutral-400 uppercase">
                    {text}
                </span>
            </div>
        </div>
    );
}
