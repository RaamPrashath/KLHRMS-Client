import { redirect } from 'next/navigation';
import {
  addOrganizationMemberAction,
  deleteOrganizationAction,
  updateOrganizationAction,
  updateOrganizationMemberRoleAction,
} from '@/app/actions/organizationActions';
import organizations, { requireOrgOwner } from '@/lib/organizations';
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

  const organization = await organizations.getOrganizationWithMembers(org.slug);
  if (!organization) {
    redirect('/organizations');
  }

  const updateAction = updateOrganizationAction.bind(null, org.slug);
  const deleteAction = deleteOrganizationAction.bind(null, org.slug);
  const addMemberAction = addOrganizationMemberAction.bind(null, org.slug);
  const updateMemberRoleAction = updateOrganizationMemberRoleAction.bind(null, org.slug);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Settings</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Admin-only controls for {org.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>
            Update the display name and office coordinates used during attendance clock-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="name">Organization name</FieldLabel>
              <Input id="name" name="name" type="text" defaultValue={org.name} required />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="latitude">Office latitude</FieldLabel>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  defaultValue={org.latitude ?? ''}
                  placeholder="e.g. 13.0827"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="longitude">Office longitude</FieldLabel>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  defaultValue={org.longitude ?? ''}
                  placeholder="e.g. 80.2707"
                />
              </Field>
            </div>

            <p className="text-xs text-muted-foreground">
              Leave either coordinate empty to clear the saved office location.
            </p>

            <Button type="submit" className="w-full sm:w-fit">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Invite people by email and assign their org role up front.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={addMemberAction} className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" placeholder="name@company.com" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="roleId">Role</FieldLabel>
              <select
                id="roleId"
                name="roleId"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>Select a role</option>
                {organization.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" className="md:self-end">
              Add member
            </Button>
          </form>

          <div className="space-y-3">
            {organization.members.map((member) => (
              <form
                key={member.id}
                action={updateMemberRoleAction}
                className="grid gap-3 rounded-lg border border-border bg-background px-4 py-4 md:grid-cols-[1.5fr_1fr_auto] md:items-center"
              >
                <input type="hidden" name="memberId" value={member.id} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.user.name ?? member.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <select
                  name="roleId"
                  defaultValue={member.roleId ?? ''}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  {organization.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline">
                  Update role
                </Button>
              </form>
            ))}
          </div>

          {organization.invites.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pending invites</h3>
                <p className="text-xs text-muted-foreground">
                  These users will receive access after they sign up.
                </p>
              </div>
              {organization.invites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.role.name} • {invite.status}
                  </p>
                </div>
              ))}
            </div>
          )}
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
