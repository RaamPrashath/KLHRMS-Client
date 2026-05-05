import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireOrgMembership } from "@/lib/organizations";
import { getScope, type RolePermissions } from "@/lib/hrms-roles";
import { WeeklyPlanClient } from "./_components/WeeklyPlanClient";

export default async function WeeklyPlanPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await params;

  let org: Awaited<ReturnType<typeof requireOrgMembership>>["org"];
  let member: Awaited<ReturnType<typeof requireOrgMembership>>["member"];
  try {
    ({ org, member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect("/organizations");
  }

  const permissions = (member.role?.permissions as RolePermissions) ?? null;

  // No access — redirect away
  if (getScope(permissions, "weeklyPlan", "view") === "none") {
    redirect(`/${orgSlug}/attendance`);
  }

  // Can view team = org-scoped view
  const canViewTeam = getScope(permissions, "weeklyPlan", "view") === "org";

  return (
    <div className="flex flex-col gap-0 -mt-6">
      <div className="px-0 pt-0 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Weekly Plan</h1>
        <p className="text-sm text-muted-foreground">
          Set your work location and project for each day of the week.
        </p>
      </div>
      <WeeklyPlanClient
        orgSlug={orgSlug}
        orgId={org.id}
        canViewTeam={canViewTeam}
      />
    </div>
  );
}
