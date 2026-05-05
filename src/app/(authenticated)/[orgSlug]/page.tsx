import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireOrgMembership } from "@/lib/organizations";
import { DashboardShell } from "@/modules/dashboard/components/DashboardShell";

export default async function DashboardPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { orgSlug } = await params;
  let memberId: string;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect("/organizations");
  }

  return (
    <div className="min-h-full bg-canvas">
      <DashboardShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
