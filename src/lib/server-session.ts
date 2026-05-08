import { cache } from "react";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getServerSession = cache(async () => {
    return auth.api.getSession({
        headers: await nextHeaders(),
    });
});

export async function requireServerSession() {
    const session = await getServerSession();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return session;
}

export async function getRequestSession(requestHeaders: Headers) {
    return auth.api.getSession({
        headers: requestHeaders,
    });
}
