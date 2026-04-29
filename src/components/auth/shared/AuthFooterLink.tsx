import Link from "next/link";

interface AuthFooterLinkProps {
    text: string;
    linkText: string;
    href: string;
}

export function AuthFooterLink({ text, linkText, href }: AuthFooterLinkProps) {
    return (
        <p className="mt-6 text-center text-sm text-muted-foreground">
            {text}{" "}
            <Link
                href={href}
                className="font-medium text-primary underline-offset-4 hover:underline"
            >
                {linkText}
            </Link>
        </p>
    );
}
