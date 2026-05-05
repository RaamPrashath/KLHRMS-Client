import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getOrganizationWithMembers, requireOrgMembership } from '@/lib/organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function OrganizationPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { orgSlug } = await params;
  let org: Awaited<ReturnType<typeof requireOrgMembership>>['org'];
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];
  let fullOrg: Awaited<ReturnType<typeof getOrganizationWithMembers>> | null = null;

  try {
    ({ org, member } = await requireOrgMembership(session.user.id, orgSlug));
    fullOrg = await getOrganizationWithMembers(orgSlug);
  } catch {
    redirect('/organizations');
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">{org.name}</h2>
        <p className="text-sm text-muted-foreground">/{org.slug}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your role</CardTitle>
            <CardDescription>Current membership for this tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{member.role?.name ?? 'No role'}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>People currently inside this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fullOrg?.members.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slug</CardTitle>
            <CardDescription>The URL is the source of truth.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm text-muted-foreground">/{org.slug}</div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
