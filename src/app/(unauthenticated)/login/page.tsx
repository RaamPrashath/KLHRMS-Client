import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login/LoginForm";
import { AuthCard } from "@/components/auth/shared/AuthCard";
import { getServerSession } from "@/lib/server-session";
import { getPublicAppUrl } from "@/lib/deployment-env";

export default async function LoginPage() {
    const session = await getServerSession();

    if (session) {
        const headersList = await headers();
        const referer = headersList.get("referer");
        let destination = "/organizations";

        if (referer) {
            try {
                const refererUrl = new URL(referer);
                const appOrigin = new URL(getPublicAppUrl()).origin;
                if (refererUrl.origin === appOrigin) {
                    destination = refererUrl.pathname + refererUrl.search + refererUrl.hash;
                }
            } catch {
                // ignore invalid referer
            }
        }

        redirect(destination);
    }

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
