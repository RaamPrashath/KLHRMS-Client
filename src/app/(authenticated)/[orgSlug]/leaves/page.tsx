import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireOrgMembership } from "@/lib/organizations";
import { getScope, type RolePermissions } from "@/lib/hrms-roles";
import { LeaveClient } from "./_components/LeaveClient";

export default async function LeavesPage({
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
  const roleName = member.role?.name ?? null;

  // Derive capability flags from the permissions JSON
  const viewScope   = getScope(permissions, "leaves", "view");
  const editScope   = getScope(permissions, "leaves", "edit");
  const approveScope = getScope(permissions, "leaves", "approve");

  // No access at all — redirect away
  if (viewScope === "none") redirect(`/${orgSlug}/attendance`);

  const canManageTypes    = editScope === "org";
  const canApprove        = approveScope !== "none";
  const canManageHolidays = canManageTypes;
  const canManageBalances = canManageTypes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>
        <p className="text-sm text-muted-foreground">
          Submit, track, and manage leave requests and balances.
        </p>
      </div>
      <LeaveClient
        orgSlug={orgSlug}
        orgId={org.id}
        role={roleName}
        canManageTypes={canManageTypes}
        canApprove={canApprove}
        canManageHolidays={canManageHolidays}
        canManageBalances={canManageBalances}
      />
    </div>
  );
}
