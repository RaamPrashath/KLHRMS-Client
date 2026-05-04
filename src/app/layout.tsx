import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
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
            className={cn(
                "h-full",
                "antialiased",
                inter.variable,
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
