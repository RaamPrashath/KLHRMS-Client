/**
 * useApiClient — React hook that returns a ready-to-use API client
 * bound to the current Better Auth session token and organization.
 *
 * Usage:
 *   const api = useApiClient(orgId);
 *   const { data } = useQuery({
 *     queryKey: ["employees", orgId],
 *     queryFn: () => api.get<Employee[]>("/employees"),
 *   });
 *
 * The hook returns null when there is no active session, so callers
 * should guard: `if (!api) return;`
 */
"use client";

import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { apiClient, type ApiClientInstance } from "@/lib/api-client";

export function useApiClient(organizationId: string | undefined | null): ApiClientInstance | null {
    const { data: session } = authClient.useSession();
    const token = session?.session?.token ?? null;

    return useMemo(() => {
        if (!token) return null;
        return apiClient(token, organizationId ?? null);
    }, [token, organizationId]);
}
