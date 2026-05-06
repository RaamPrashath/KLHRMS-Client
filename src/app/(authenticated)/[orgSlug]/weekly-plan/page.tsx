import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireOrgMembership } from "@/lib/organizations";
import { getScope, type RolePermissions } from "@/lib/hrms-roles";
import { PlanClient } from "./_components/PlanClient";

export default async function PlanPage({
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
  if (getScope(permissions, "weeklyPlan", "view") === "none") {
    redirect(`/${orgSlug}/attendance`);
  }

  const weeklyPlanScope = getScope(permissions, "weeklyPlan", "view");
  const canViewTeam = ["org", "organization"].includes(weeklyPlanScope);

  return (
    <div className="flex flex-col gap-6 ">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Plan
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Capture where you plan to work each day, save in bulk, and switch between
            a focused weekly flow and a full-month strip view without leaving the page.
          </p>
        </div>
      </div>

      <PlanClient
        orgSlug={orgSlug}
        orgId={org.id}
        memberId={member.id}
        userId={session.user.id}
        canViewTeam={canViewTeam}
      />
    </div>
  );
}
