"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const sessionQueryKey = ["auth", "session"] as const;

type SessionResult = Awaited<ReturnType<typeof authClient.getSession>>;
export type AppSession = SessionResult["data"];

export function useSession() {
    return useQuery({
        queryKey: sessionQueryKey,
        queryFn: async () => {
            const result = await authClient.getSession();

            if (result.error) {
                throw new Error(result.error.message ?? "Failed to load session");
            }

            return result.data ?? null;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
}
