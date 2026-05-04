"use client";

/**
 * membership — Layer 2a query hook.
 *
 * Wraps fetchOrgMembership in useQuery.
 * Calls the Next.js internal route — not FastAPI.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchOrgMembership } from "@/hooks/functions/membership";

export const ORG_MEMBERSHIP_KEY = (slug: string) =>
  ["org_membership", slug] as const;

export function useOrgMembershipQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ORG_MEMBERSHIP_KEY(slug ?? ""),
    queryFn: () => fetchOrgMembership(slug!),
    enabled: Boolean(slug),
  });
}
