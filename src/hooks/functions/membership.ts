/**
 * membership — Layer 1 fetch functions.
 *
 * Calls the Next.js internal route handler at /api/organizations/[slug].
 * This is NOT a FastAPI call — it goes to the Next.js app itself (Prisma layer).
 * Uses plain fetch with a relative URL (no apiClient needed).
 */

export interface OrgMembershipResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
  };
  membership: {
    role: {
      id?: string;
      name: string | null;
      permissions?: Record<string, Record<string, string>> | null;
    } | null;
  } | null;
}

export async function fetchOrgMembership(
  slug: string,
): Promise<OrgMembershipResponse> {
  const res = await fetch(`/api/organizations/${slug}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OrgMembershipResponse>;
}
