import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireOrgMembership } from "@/lib/organizations";
import { HrmsRole } from "@/lib/hrms-roles";
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

  const role = member.hrmsRole as HrmsRole | null;
  if (!role) redirect(`/${orgSlug}/attendance`);

  const canManageTypes =
    role === HrmsRole.SUPER_ADMIN ||
    role === HrmsRole.HR ||
    role === HrmsRole.ADMIN;

  const canApprove =
    role === HrmsRole.SUPER_ADMIN ||
    role === HrmsRole.HR ||
    role === HrmsRole.ADMIN ||
    role === HrmsRole.MANAGER;

  const canManageHolidays = canManageTypes;

  // Balance management: HR and ADMIN can allocate/edit balances for any employee.
  // SUPER_ADMIN inherits this via canManageTypes already being true.
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
        role={role}
        canManageTypes={canManageTypes}
        canApprove={canApprove}
        canManageHolidays={canManageHolidays}
        canManageBalances={canManageBalances}
      />
    </div>
  );
}
