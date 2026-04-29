import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth/onboarding/OnboardingForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function OnboardingPage() {
    return (
        <AuthCard>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                <OnboardingForm />
            </Suspense>
        </AuthCard>
    );
}
