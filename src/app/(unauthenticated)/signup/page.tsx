import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup/SignupForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function SignupPage() {
    return (
        <AuthCard>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                <SignupForm />
            </Suspense>
        </AuthCard>
    );
}
