import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { requireOrgMembership } from '@/lib/organizations';
import { OrgSidebarShell } from '@/components/sidebar/org-sidebar-shell';

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { orgSlug } = await params;
  let org: Awaited<ReturnType<typeof requireOrgMembership>>['org'];

  try {
    ({ org } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const userImage = (session.user as { image?: string | null }).image ?? null;

  return (
    <OrgSidebarShell
      orgSlug={org.slug}
      orgName={org.name}
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: userImage,
      }}
    >
      {children}
    </OrgSidebarShell>
  );
}
