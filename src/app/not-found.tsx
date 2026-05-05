import Link from "next/link";
import { Construction } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-5 text-center px-4">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <Construction className="h-7 w-7 text-neutral-400" />
            </div>

            <div className="flex flex-col gap-1.5 max-w-xs">
                <h1 className="text-lg font-semibold tracking-tight">
                    Coming soon
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    This page is under construction. Check back soon.
                </p>
            </div>

            <Link
                href="/organizations"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
                Back to organizations
            </Link>
        </div>
    );
}
