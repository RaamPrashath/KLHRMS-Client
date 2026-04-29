import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <div className="w-full max-w-2xl">
                <h1 className="text-2xl font-semibold text-foreground">Organizations</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Welcome, {session.user.name ?? session.user.email}
                </p>
            </div>
        </main>
    );
}
