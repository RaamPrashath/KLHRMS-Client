import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding/OnboardingForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";
import { getServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
    const session = await getServerSession();

    if (session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { onboarded: true },
        });

        if (user?.onboarded) {
            redirect("/post-auth");
        }
    }

    return (
        <AuthCard>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                <OnboardingForm />
            </Suspense>
        </AuthCard>
    );
}
