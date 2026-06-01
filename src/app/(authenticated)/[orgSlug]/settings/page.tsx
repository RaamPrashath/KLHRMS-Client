import { redirect } from 'next/navigation';
import {
  deleteOrganizationAction,
} from '@/app/actions/organizationActions';
import organizations, { requireOrgOwner } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MicrosoftSettingsTab } from '@/modules/microsoft-graph/components/MicrosoftSettingsTab';
import { OrganizationDetailsForm } from '@/modules/settings/components/OrganizationDetailsForm';

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

  const organization = await organizations.getOrganizationWithMembers(org.slug);
  if (!organization) {
    redirect('/organizations');
  }

  const deleteAction = deleteOrganizationAction.bind(null, org.slug);
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Admin-only controls for {org.name}.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="microsoft">Microsoft Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
              <CardDescription>
                Update the display name and office coordinates used during attendance clock-in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationDetailsForm
                orgSlug={org.slug}
                name={org.name}
                latitude={org.latitude}
                longitude={org.longitude}
              />
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
        </TabsContent>

        <TabsContent value="microsoft" className="mt-6">
          <MicrosoftSettingsTab orgSlug={orgSlug} memberId={organization.members.find(m => m.user?.id === session.user.id)?.id ?? ''} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
