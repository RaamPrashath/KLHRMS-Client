"use client";

/**
 * useApiClient — returns the session token and orgId needed by fetch functions.
 *
 * Returns null when there is no active session.
 * Query/mutation hooks guard with: enabled: !!auth
 */

import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

export interface ApiAuth {
  token: string;
  orgId: string;
}

export function useApiClient(orgId: string | undefined | null): ApiAuth | null {
  const { data: session } = authClient.useSession();
  const token = session?.session?.token ?? null;

  return useMemo(() => {
    if (!token || !orgId) return null;
    return { token, orgId };
  }, [token, orgId]);
}
