import { redirect } from "next/navigation";
import { requireOrgMembership } from "@/lib/organizations";
import { OrgSidebarShell } from "@/components/sidebar/org-sidebar-shell";
import { type RolePermissions } from "@/lib/hrms-roles";
import { requireServerSession } from "@/lib/server-session";

export default async function OrganizationLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ orgSlug: string }>;
}>) {
    const session = await requireServerSession();

    const { orgSlug } = await params;
    let org: Awaited<ReturnType<typeof requireOrgMembership>>["org"];
    let member: Awaited<ReturnType<typeof requireOrgMembership>>["member"];

    try {
        ({ org, member } = await requireOrgMembership(session.user.id, orgSlug));
    } catch {
        redirect("/organizations");
    }

    const userImage = (session.user as { image?: string | null }).image ?? null;

    return (
        <OrgSidebarShell
            orgSlug={org.slug}
            orgName={org.name}
            roleName={member.role?.name ?? null}
            permissions={(member.role?.permissions as RolePermissions) ?? null}
            user={{
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                image: userImage,
            }}
        >
            {children}
        </OrgSidebarShell>
    );
}
