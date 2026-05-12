import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import Script from "next/script";

const figtree = Figtree({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800", "900"],
    variable: "--font-sans",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "KL HRMS",
    description: "HRMS tool for the organization",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "h-full",
                "antialiased",
                figtree.variable,
                jetbrainsMono.variable,
                "font-sans",
            )}
        >
            <body className="min-h-full flex flex-col">
                <Providers>{children}</Providers>

                <Toaster position="bottom-right"/>
</body>
        </html>
    );
}
