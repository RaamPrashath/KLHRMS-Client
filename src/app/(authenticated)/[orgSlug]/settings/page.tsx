import { redirect } from 'next/navigation';
import {
  deleteOrganizationAction,
  updateOrganizationAction,
} from '@/app/actions/organizationActions';
import { requireOrgOwner } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default async function OrganizationSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();

  const { orgSlug } = await params;
  let org: Awaited<ReturnType<typeof requireOrgOwner>>['org'];

  try {
    ({ org } = await requireOrgOwner(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const updateAction = updateOrganizationAction.bind(null, org.slug);
  const deleteAction = deleteOrganizationAction.bind(null, org.slug);

  return (
    <section className="grid gap-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner-only controls for {org.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rename organization</CardTitle>
          <CardDescription>
            This updates the display name. The slug stays immutable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="name">Organization name</FieldLabel>
              <Input id="name" name="name" type="text" defaultValue={org.name} required />
            </Field>

            <Button type="submit" className="w-full sm:w-fit">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete organization</CardTitle>
          <CardDescription>
            This permanently removes the tenant and all of its memberships.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteAction} className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="confirmSlug">
                Type /{org.slug} to confirm deletion
              </FieldLabel>
              <Input
                id="confirmSlug"
                name="confirmSlug"
                type="text"
                placeholder={org.slug}
                required
              />
            </Field>

            <Button type="submit" variant="destructive" className="w-full sm:w-fit">
              Delete organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
