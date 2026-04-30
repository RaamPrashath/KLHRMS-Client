'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

type OrgResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
  };
  membership?: { role: 'OWNER' | 'EMPLOYEE' } | null;
};

export function useMembership(passedSlug?: string) {
  const params = useParams() as Record<string, string | undefined> | null;
  const slug = passedSlug ?? params?.orgSlug ?? params?.slug;
  const enabled = !!slug;

  const query = useQuery<OrgResponse, Error>({
    queryKey: ['org', slug],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${slug}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled,
  });

  const org = query.data?.organization ?? null;
  const membership = query.data?.membership ?? null;

  return {
    org,
    membership,
    isMember: !!membership,
    isOwner: membership?.role === 'OWNER',
    ...query,
  };
}
