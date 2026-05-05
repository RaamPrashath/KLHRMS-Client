"use client";

/**
 * useMembership — convenience wrapper around useOrgMembershipQuery.
 *
 * Reads orgSlug from route params when not passed explicitly.
 * Calls the Next.js internal /api/organizations/[slug] route (not FastAPI).
 */

import { useParams } from "next/navigation";
import { useOrgMembershipQuery } from "@/hooks/queries/membership";

export function useMembership(passedSlug?: string) {
  const params = useParams() as Record<string, string | undefined> | null;
  const slug = passedSlug ?? params?.orgSlug ?? params?.slug;

  const query = useOrgMembershipQuery(slug);

  const org = query.data?.organization ?? null;
  const membership = query.data?.membership ?? null;

  return {
    org,
    membership,
    isMember: !!membership,
    isOwner: membership?.role === "OWNER",
    ...query,
  };
}
