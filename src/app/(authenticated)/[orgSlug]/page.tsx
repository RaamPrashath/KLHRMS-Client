import { redirect } from "next/navigation";
import { requireOrgMembership } from "@/lib/organizations";
import { requireServerSession } from "@/lib/server-session";
import type { RolePermissions } from "@/lib/hrms-roles";
import { DashboardShell } from "@/modules/dashboard/components/DashboardShell";

export default async function DashboardPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();

  const { orgSlug } = await params;
  let orgId: string;
  let memberId: string;
  let roleName: string | null = null;
  let permissions: RolePermissions | null = null;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    orgId = member.organizationId;
    memberId = member.id;
    roleName = member.role?.name ?? null;
    permissions = (member.role?.permissions as RolePermissions) ?? null;
  } catch {
    redirect("/organizations");
  }

  return (
    <div className="min-h-full bg-canvas">
      <DashboardShell
        orgSlug={orgSlug}
        orgId={orgId!}
        memberId={memberId!}
        roleName={roleName}
        permissions={permissions}
      />
    </div>
  );
}
