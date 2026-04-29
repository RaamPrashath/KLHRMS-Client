import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/verify-email/VerifyEmailForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function VerifyEmailPage() {
    return (
        <AuthCard>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                <VerifyEmailForm />
            </Suspense>
        </AuthCard>
    );
}
