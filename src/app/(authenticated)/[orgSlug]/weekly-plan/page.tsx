import { redirect } from "next/navigation";
import { requireOrgMembership } from "@/lib/organizations";
import { getScope, type RolePermissions } from "@/lib/hrms-roles";
import { requireServerSession } from "@/lib/server-session";
import { PlanClient } from "./_components/PlanClient";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await requireServerSession();

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
  const canViewTeam = ["org", "organization", "department"].includes(weeklyPlanScope);

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
          Plans
        </h1>
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
