import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SignupForm } from "@/components/auth/signup/SignupForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function SignupPage() {
    return (
        <AuthCard>
            <Suspense 
                fallback={
                    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                        <span className="sr-only">Loading sign up form...</span>
                    </div>
                }
            >
                <SignupForm />
            </Suspense>
        </AuthCard>
    );
}
