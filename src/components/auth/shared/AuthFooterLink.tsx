import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AuthFooterLinkProps {
    text: string;
    linkText: string;
    href: string;
}

export function AuthFooterLink({ text, linkText, href }: AuthFooterLinkProps) {
    return (
        <p className="mt-6 text-center text-sm text-neutral-500">
            {text}{" "}
            <Link
                href={href}
                className="font-semibold text-neutral-900 hover:text-primary transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
            >
                {linkText}
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
        </p>
    );
}
