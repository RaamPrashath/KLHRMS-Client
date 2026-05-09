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
  const canViewTeam = ["org", "organization"].includes(weeklyPlanScope);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[40px] font-semibold tracking-[-0.02em] text-foreground">
          Plans
        </h1>
        <p className="max-w-2xl text-[15px] leading-6 text-muted-foreground">
          Set where work happens across the week, then review the pattern before you save.
        </p>
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
