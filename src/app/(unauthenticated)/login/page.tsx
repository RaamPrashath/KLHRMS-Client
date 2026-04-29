import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login/LoginForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";

export default function LoginPage() {
    return (
        <AuthCard>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </AuthCard>
    );
}
