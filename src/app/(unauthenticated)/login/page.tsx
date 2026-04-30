import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login/LoginForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function LoginPage() {
    return (
        <AuthCard>
            <Suspense 
                fallback={
                    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                        <span className="sr-only">Loading sign in form...</span>
                    </div>
                }
            >
                <LoginForm />
            </Suspense>
        </AuthCard>
    );
}
